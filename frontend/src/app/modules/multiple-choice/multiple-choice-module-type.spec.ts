import { createChoiceForm, multipleChoiceModuleType } from './multiple-choice-module-type';

describe('multipleChoiceModuleType', () => {
  it('starts with two empty choices', () => {
    const form = multipleChoiceModuleType.createForm();

    expect(form.controls.choices.length).toBe(2);
    expect(form.valid).toBe(false);
  });

  it('converts the form to content, giving new choices unique ids', () => {
    const form = multipleChoiceModuleType.createForm();
    form.controls.choices.push(createChoiceForm());
    form.setValue({
      question: '  What is a cell? ',
      choices: [
        { id: null, text: ' The basic unit of life ', correct: true },
        { id: null, text: 'A planet', correct: false },
        { id: null, text: 'A living unit', correct: true },
      ],
      explanation: '   ',
    });

    expect(form.valid).toBe(true);
    const content = multipleChoiceModuleType.toContent(form);
    const ids = content.choices.map((choice) => choice.id);
    expect(new Set(ids).size).toBe(3);
    expect(content).toEqual({
      question: 'What is a cell?',
      choices: [
        { id: ids[0], text: 'The basic unit of life' },
        { id: ids[1], text: 'A planet' },
        { id: ids[2], text: 'A living unit' },
      ],
      correctChoiceIds: [ids[0], ids[2]],
      explanation: null,
    });
  });

  it('fills the form with existing content and keeps the choice ids', () => {
    const content = {
      question: 'What is a cell?',
      choices: [
        { id: 'c1', text: 'A planet' },
        { id: 'c2', text: 'The basic unit of life' },
        { id: 'c3', text: 'A star' },
      ],
      correctChoiceIds: ['c2'],
      explanation: null,
    };
    const form = multipleChoiceModuleType.createForm(content);

    expect(form.valid).toBe(true);
    expect(multipleChoiceModuleType.toContent(form)).toEqual(content);
  });

  it('never gives a new choice the id of a removed one', () => {
    const form = multipleChoiceModuleType.createForm({
      question: 'Question?',
      choices: [
        { id: 'c1', text: 'A' },
        { id: 'c2', text: 'B' },
        { id: 'c3', text: 'C' },
      ],
      correctChoiceIds: ['c1'],
      explanation: null,
    });

    form.controls.choices.removeAt(2);
    form.controls.choices.push(createChoiceForm());
    form.controls.choices.at(2).controls.text.setValue('New');

    const ids = multipleChoiceModuleType.toContent(form).choices.map((choice) => choice.id);
    expect(ids.slice(0, 2)).toEqual(['c1', 'c2']);
    expect(['c1', 'c2', 'c3']).not.toContain(ids[2]);
  });

  it('requires at least one correct choice', () => {
    const form = multipleChoiceModuleType.createForm();
    form.setValue({
      question: 'Question?',
      choices: [
        { id: null, text: 'A', correct: false },
        { id: null, text: 'B', correct: false },
      ],
      explanation: '',
    });

    expect(form.controls.choices.hasError('noCorrectChoice')).toBe(true);
  });

  it('requires at least two choices', () => {
    const form = multipleChoiceModuleType.createForm();
    form.controls.choices.removeAt(1);

    expect(form.controls.choices.hasError('tooFewChoices')).toBe(true);
  });

  it('requires a text for each choice', () => {
    const form = multipleChoiceModuleType.createForm();

    expect(form.controls.choices.at(0).controls.text.hasError('required')).toBe(true);
  });
});
