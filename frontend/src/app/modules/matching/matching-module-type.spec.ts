import { createPairForm, matchingModuleType } from './matching-module-type';

describe('matchingModuleType', () => {
  it('starts with two empty pairs', () => {
    const form = matchingModuleType.createForm();

    expect(form.controls.pairs.length).toBe(2);
    expect(form.valid).toBe(false);
  });

  it('converts the form to content with pair ids', () => {
    const form = matchingModuleType.createForm();
    form.setValue({
      instructions: '   ',
      pairs: [
        { concept: ' Mitosis ', definition: ' Two identical cells ' },
        { concept: 'Meiosis', definition: 'Gametes' },
      ],
    });

    expect(form.valid).toBe(true);
    expect(matchingModuleType.toContent(form)).toEqual({
      instructions: null,
      pairs: [
        { id: 'p1', concept: 'Mitosis', definition: 'Two identical cells' },
        { id: 'p2', concept: 'Meiosis', definition: 'Gametes' },
      ],
    });
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
      { concept: 'Mitosis', definition: 'Same' },
      { concept: ' mitosis', definition: 'SAME ' },
      { concept: 'Meiosis', definition: 'Other' },
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
