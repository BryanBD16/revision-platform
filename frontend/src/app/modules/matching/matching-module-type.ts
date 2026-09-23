import { AbstractControl, FormArray, FormControl, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { notBlank } from '../../shared/validators';
import { ModuleTypeDefinition } from '../module-type';
import { MATCHING_LIMITS, MatchingContent } from './matching-content';
import { MatchingEditor } from './matching-editor/matching-editor';
import { MatchingPlayer } from './matching-player/matching-player';

export type PairForm = FormGroup<{
  concept: FormControl<string>;
  definition: FormControl<string>;
}>;

export type MatchingForm = FormGroup<{
  instructions: FormControl<string>;
  pairs: FormArray<PairForm>;
}>;

export function createPairForm(): PairForm {
  return new FormGroup({
    concept: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(MATCHING_LIMITS.conceptMaxLength)],
    }),
    definition: new FormControl('', {
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
  createForm: () =>
    new FormGroup({
      instructions: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(MATCHING_LIMITS.instructionsMaxLength)],
      }),
      pairs: new FormArray([createPairForm(), createPairForm()], { validators: [validPairs] }),
    }),
  toContent: (form) => {
    const { instructions, pairs } = form.getRawValue();
    return {
      instructions: instructions.trim() || null,
      // Pair ids only need to be unique within the module.
      pairs: pairs.map((pair, index) => ({
        id: `p${index + 1}`,
        concept: pair.concept.trim(),
        definition: pair.definition.trim(),
      })),
    };
  },
  editor: MatchingEditor,
  player: MatchingPlayer,
};
