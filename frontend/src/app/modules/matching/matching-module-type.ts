import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { newItemId } from '../../shared/item-ids';
import { notBlank } from '../../shared/validators';
import { ModuleTypeDefinition } from '../module-type';
import { MATCHING_LIMITS, MatchingContent, MatchingPair } from './matching-content';
import { MatchingEditor } from './matching-editor/matching-editor';
import { MatchingPlayer } from './matching-player/matching-player';

export type PairForm = FormGroup<{
  /** The id of an existing pair, or null for a new one (see toContent). */
  id: FormControl<string | null>;
  concept: FormControl<string>;
  definition: FormControl<string>;
}>;

export type MatchingForm = FormGroup<{
  instructions: FormControl<string>;
  pairs: FormArray<PairForm>;
}>;

export function createPairForm(pair?: MatchingPair): PairForm {
  return new FormGroup({
    id: new FormControl(pair?.id ?? null),
    concept: new FormControl(pair?.concept ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(MATCHING_LIMITS.conceptMaxLength)],
    }),
    definition: new FormControl(pair?.definition ?? '', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(MATCHING_LIMITS.definitionMaxLength)],
    }),
  });
}

function hasDuplicates(texts: string[]): boolean {
  const keys = texts.map((text) => text.trim().toLocaleLowerCase()).filter((key) => key);
  return new Set(keys).size !== keys.length;
}

function validPairs(
  control: AbstractControl<{ concept: string; definition: string }[]>,
): ValidationErrors | null {
  const pairs = control.value;
  const errors: ValidationErrors = {};
  if (pairs.length < MATCHING_LIMITS.minPairs) {
    errors['tooFewPairs'] = true;
  }
  if (hasDuplicates(pairs.map((pair) => pair.concept))) {
    errors['duplicateConcepts'] = true;
  }
  if (hasDuplicates(pairs.map((pair) => pair.definition))) {
    errors['duplicateDefinitions'] = true;
  }
  return Object.keys(errors).length > 0 ? errors : null;
}

export const matchingModuleType: ModuleTypeDefinition<MatchingContent, MatchingForm> = {
  type: 'matching',
  label: 'Matching',
  createForm: (content) =>
    new FormGroup({
      instructions: new FormControl(content?.instructions ?? '', {
        nonNullable: true,
        validators: [Validators.maxLength(MATCHING_LIMITS.instructionsMaxLength)],
      }),
      pairs: new FormArray(
        content
          ? content.pairs.map((pair) => createPairForm(pair))
          : [createPairForm(), createPairForm()],
        { validators: [validPairs] },
      ),
    }),
  toContent: (form) => {
    const { instructions, pairs } = form.getRawValue();
    // Existing pairs keep their id; new ones get an id unique within the module.
    const taken = new Set(pairs.map((pair) => pair.id).filter((id) => id !== null));
    return {
      instructions: instructions.trim() || null,
      pairs: pairs.map((pair) => {
        const id = pair.id ?? newItemId('p-', taken);
        taken.add(id);
        return { id, concept: pair.concept.trim(), definition: pair.definition.trim() };
      }),
    };
  },
  summarize: (content) => content.instructions ?? `Match ${content.pairs.length} concepts`,
  editor: MatchingEditor,
  player: MatchingPlayer,
};
