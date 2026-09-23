import { createPairForm, matchingModuleType } from './matching-module-type';

describe('matchingModuleType', () => {
  it('starts with two empty pairs', () => {
    const form = matchingModuleType.createForm();

    expect(form.controls.pairs.length).toBe(2);
    expect(form.valid).toBe(false);
  });

  it('converts the form to content, giving new pairs unique ids', () => {
    const form = matchingModuleType.createForm();
    form.setValue({
      instructions: '   ',
      pairs: [
        { id: null, concept: ' Mitosis ', definition: ' Two identical cells ' },
        { id: null, concept: 'Meiosis', definition: 'Gametes' },
      ],
    });

    expect(form.valid).toBe(true);
    const content = matchingModuleType.toContent(form);
    const ids = content.pairs.map((pair) => pair.id);
    expect(ids[0]).not.toBe(ids[1]);
    expect(content).toEqual({
      instructions: null,
      pairs: [
        { id: ids[0], concept: 'Mitosis', definition: 'Two identical cells' },
        { id: ids[1], concept: 'Meiosis', definition: 'Gametes' },
      ],
    });
  });

  it('fills the form with existing content and keeps the pair ids', () => {
    const content = {
      instructions: 'Match them.',
      pairs: [
        { id: 'p1', concept: 'Mitosis', definition: 'Two identical cells' },
        { id: 'p2', concept: 'Meiosis', definition: 'Gametes' },
      ],
    };
    const form = matchingModuleType.createForm(content);

    expect(form.valid).toBe(true);
    expect(matchingModuleType.toContent(form)).toEqual(content);
  });

  it('never gives a new pair the id of a removed one', () => {
    const form = matchingModuleType.createForm({
      instructions: null,
      pairs: [
        { id: 'p1', concept: 'A', definition: '1' },
        { id: 'p2', concept: 'B', definition: '2' },
      ],
    });

    form.controls.pairs.removeAt(1);
    form.controls.pairs.push(createPairForm());
    form.controls.pairs.at(1).patchValue({ concept: 'C', definition: '3' });

    const ids = matchingModuleType.toContent(form).pairs.map((pair) => pair.id);
    expect(ids[0]).toBe('p1');
    expect(['p1', 'p2']).not.toContain(ids[1]);
  });

  it('is summarized by its instructions, or else by its number of pairs', () => {
    const pairs = [
      { id: 'p1', concept: 'A', definition: '1' },
      { id: 'p2', concept: 'B', definition: '2' },
    ];

    expect(matchingModuleType.summarize({ instructions: 'Match the phases.', pairs })).toBe(
      'Match the phases.',
    );
    expect(matchingModuleType.summarize({ instructions: null, pairs })).toBe('Match 2 concepts');
  });

  it('requires at least two pairs', () => {
    const form = matchingModuleType.createForm();
    form.controls.pairs.removeAt(1);

    expect(form.controls.pairs.hasError('tooFewPairs')).toBe(true);
  });

  it('rejects duplicate concepts and definitions, ignoring case', () => {
    const form = matchingModuleType.createForm();
    form.controls.pairs.push(createPairForm());
    form.controls.pairs.setValue([
      { id: null, concept: 'Mitosis', definition: 'Same' },
      { id: null, concept: ' mitosis', definition: 'SAME ' },
      { id: null, concept: 'Meiosis', definition: 'Other' },
    ]);

    expect(form.controls.pairs.hasError('duplicateConcepts')).toBe(true);
    expect(form.controls.pairs.hasError('duplicateDefinitions')).toBe(true);
  });

  it('does not report empty texts as duplicates', () => {
    const form = matchingModuleType.createForm();

    expect(form.controls.pairs.hasError('duplicateConcepts')).toBe(false);
    expect(form.controls.pairs.at(0).controls.concept.hasError('required')).toBe(true);
  });
});
