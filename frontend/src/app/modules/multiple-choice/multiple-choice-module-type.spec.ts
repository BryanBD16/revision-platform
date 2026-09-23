import { createChoiceForm, multipleChoiceModuleType } from './multiple-choice-module-type';

describe('multipleChoiceModuleType', () => {
  it('starts with two empty choices', () => {
    const form = multipleChoiceModuleType.createForm();

    expect(form.controls.choices.length).toBe(2);
    expect(form.valid).toBe(false);
  });

  it('converts the form to content with choice ids', () => {
    const form = multipleChoiceModuleType.createForm();
    form.controls.choices.push(createChoiceForm());
    form.setValue({
      question: '  What is a cell? ',
      choices: [
        { text: ' The basic unit of life ', correct: true },
        { text: 'A planet', correct: false },
        { text: 'A living unit', correct: true },
      ],
      explanation: '   ',
    });

    expect(form.valid).toBe(true);
    expect(multipleChoiceModuleType.toContent(form)).toEqual({
      question: 'What is a cell?',
      choices: [
        { id: 'c1', text: 'The basic unit of life' },
        { id: 'c2', text: 'A planet' },
        { id: 'c3', text: 'A living unit' },
      ],
      correctChoiceIds: ['c1', 'c3'],
      explanation: null,
    });
  });

  it('requires at least one correct choice', () => {
    const form = multipleChoiceModuleType.createForm();
    form.setValue({
      question: 'Question?',
      choices: [
        { text: 'A', correct: false },
        { text: 'B', correct: false },
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
