import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MultipleChoiceForm, multipleChoiceModuleType } from '../multiple-choice-module-type';
import { MultipleChoiceEditor } from './multiple-choice-editor';

describe('MultipleChoiceEditor', () => {
  let fixture: ComponentFixture<MultipleChoiceEditor>;
  let element: HTMLElement;
  let form: MultipleChoiceForm;

  function button(label: string): HTMLButtonElement {
    return [...element.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
    )!;
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(MultipleChoiceEditor);
    element = fixture.nativeElement;
    form = multipleChoiceModuleType.createForm();
    fixture.componentRef.setInput('form', form);
    await fixture.whenStable();
  });

  it('edits the question, the choices and which are correct', async () => {
    const question = element.querySelector('textarea')!;
    question.value = 'What is a cell?';
    question.dispatchEvent(new Event('input'));
    const texts = element.querySelectorAll<HTMLInputElement>('.choice-row input[type="text"]');
    texts[0].value = 'The basic unit of life';
    texts[0].dispatchEvent(new Event('input'));
    element.querySelector<HTMLInputElement>('[aria-label="Choice 1 is correct"]')!.click();

    expect(form.getRawValue()).toEqual({
      question: 'What is a cell?',
      choices: [
        { text: 'The basic unit of life', correct: true },
        { text: '', correct: false },
      ],
      explanation: '',
    });
  });

  it('adds and removes choices, keeping at least two', async () => {
    expect(button('Remove choice 1').disabled).toBe(true);

    button('Add choice').click();
    await fixture.whenStable();
    expect(form.controls.choices.length).toBe(3);
    expect(button('Remove choice 1').disabled).toBe(false);

    button('Remove choice 1').click();
    await fixture.whenStable();
    expect(form.controls.choices.length).toBe(2);
  });

  it('cannot add more than ten choices', async () => {
    for (let i = 0; i < 8; i++) {
      button('Add choice').click();
    }
    await fixture.whenStable();

    expect(form.controls.choices.length).toBe(10);
    expect(button('Add choice').disabled).toBe(true);
  });

  it('asks to mark a correct choice once the form is touched', async () => {
    form.markAllAsTouched();
    await fixture.whenStable();

    expect(element.textContent).toContain('The question is required.');
    expect(element.textContent).toContain('Choice 1 needs a text.');
    expect(element.textContent).toContain('Mark at least one choice as correct.');
  });
});
