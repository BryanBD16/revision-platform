import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { notBlank } from '../../shared/validators';
import { ModuleTypeDefinition } from '../module-type';
import { MultipleChoiceEditor } from './multiple-choice-editor/multiple-choice-editor';
import { MULTIPLE_CHOICE_LIMITS, MultipleChoiceContent } from './multiple-choice-content';
import { MultipleChoicePlayer } from './multiple-choice-player/multiple-choice-player';

export type ChoiceForm = FormGroup<{
  text: FormControl<string>;
  correct: FormControl<boolean>;
}>;

export type MultipleChoiceForm = FormGroup<{
  question: FormControl<string>;
  choices: FormArray<ChoiceForm>;
  explanation: FormControl<string>;
}>;

export function createChoiceForm(): ChoiceForm {
  return new FormGroup({
    text: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(MULTIPLE_CHOICE_LIMITS.choiceTextMaxLength)],
    }),
    correct: new FormControl(false, { nonNullable: true }),
  });
}

function validChoices(control: AbstractControl<{ correct: boolean }[]>): ValidationErrors | null {
  if (control.value.length < MULTIPLE_CHOICE_LIMITS.minChoices) {
    return { tooFewChoices: true };
  }
  if (!control.value.some((choice) => choice.correct)) {
    return { noCorrectChoice: true };
  }
  return null;
}

export const multipleChoiceModuleType: ModuleTypeDefinition<MultipleChoiceContent, MultipleChoiceForm> = {
  type: 'multiple-choice',
  label: 'Multiple choice',
  createForm: () =>
    new FormGroup({
      question: new FormControl('', {
        nonNullable: true,
        validators: [notBlank, Validators.maxLength(MULTIPLE_CHOICE_LIMITS.questionMaxLength)],
      }),
      choices: new FormArray([createChoiceForm(), createChoiceForm()], {
        validators: [validChoices],
      }),
      explanation: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(MULTIPLE_CHOICE_LIMITS.explanationMaxLength)],
      }),
    }),
  toContent: (form) => {
    const { question, choices, explanation } = form.getRawValue();
    // Choice ids only need to be unique within the question.
    const withIds = choices.map((choice, index) => ({ ...choice, id: `c${index + 1}` }));
    return {
      question: question.trim(),
      choices: withIds.map(({ id, text }) => ({ id, text: text.trim() })),
      correctChoiceIds: withIds.filter((choice) => choice.correct).map((choice) => choice.id),
      explanation: explanation.trim() || null,
    };
  },
  editor: MultipleChoiceEditor,
  player: MultipleChoicePlayer,
};
