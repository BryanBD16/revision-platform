import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { newItemId } from '../../shared/item-ids';
import { notBlank } from '../../shared/validators';
import { ModuleTypeDefinition } from '../module-type';
import { MultipleChoiceEditor } from './multiple-choice-editor/multiple-choice-editor';
import { Choice, MULTIPLE_CHOICE_LIMITS, MultipleChoiceContent } from './multiple-choice-content';
import { MultipleChoicePlayer } from './multiple-choice-player/multiple-choice-player';

export type ChoiceForm = FormGroup<{
  /** The id of an existing choice, or null for a new one (see toContent). */
  id: FormControl<string | null>;
  text: FormControl<string>;
  correct: FormControl<boolean>;
}>;

export type MultipleChoiceForm = FormGroup<{
  question: FormControl<string>;
  choices: FormArray<ChoiceForm>;
  explanation: FormControl<string>;
}>;

export function createChoiceForm(choice?: Choice, correct = false): ChoiceForm {
  return new FormGroup({
    id: new FormControl(choice?.id ?? null),
    text: new FormControl(choice?.text ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(MULTIPLE_CHOICE_LIMITS.choiceTextMaxLength)],
    }),
    correct: new FormControl(correct, { nonNullable: true }),
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

export const multipleChoiceModuleType: ModuleTypeDefinition<
  MultipleChoiceContent,
  MultipleChoiceForm
> = {
  type: 'multiple-choice',
  label: 'Multiple choice',
  createForm: (content) =>
    new FormGroup({
      question: new FormControl(content?.question ?? '', {
        nonNullable: true,
        validators: [notBlank, Validators.maxLength(MULTIPLE_CHOICE_LIMITS.questionMaxLength)],
      }),
      choices: new FormArray(
        content
          ? content.choices.map((choice) =>
              createChoiceForm(choice, content.correctChoiceIds.includes(choice.id)),
            )
          : [createChoiceForm(), createChoiceForm()],
        { validators: [validChoices] },
      ),
      explanation: new FormControl(content?.explanation ?? '', {
        nonNullable: true,
        validators: [Validators.maxLength(MULTIPLE_CHOICE_LIMITS.explanationMaxLength)],
      }),
    }),
  toContent: (form) => {
    const { question, choices, explanation } = form.getRawValue();
    // Existing choices keep their id; new ones get an id unique within the question.
    const taken = new Set(choices.map((choice) => choice.id).filter((id) => id !== null));
    const withIds = choices.map((choice) => {
      const id = choice.id ?? newItemId('c-', taken);
      taken.add(id);
      return { ...choice, id };
    });
    return {
      question: question.trim(),
      choices: withIds.map(({ id, text }) => ({ id, text: text.trim() })),
      correctChoiceIds: withIds.filter((choice) => choice.correct).map((choice) => choice.id),
      explanation: explanation.trim() || null,
    };
  },
  summarize: (content) => content.question,
  editor: MultipleChoiceEditor,
  player: MultipleChoicePlayer,
};
