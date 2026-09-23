import { InputSignal, OutputEmitterRef, Type } from '@angular/core';
import { FormGroup } from '@angular/forms';

/**
 * The contract every module type implements in the frontend. The rest of the
 * application only uses this contract, never a specific module type.
 */
export interface ModuleTypeDefinition<TContent = unknown, TForm extends FormGroup = FormGroup> {
  /** The type key used by the API, e.g. "reading". */
  readonly type: string;
  /** Name shown to users, e.g. "Reading". */
  readonly label: string;
  /**
   * Creates the form that edits this module's content, with its validators: empty for a
   * new module, or filled with `content` to edit an existing module. The ids of the items
   * of the content (choices, pairs...) must be kept, since saved answers refer to them.
   */
  createForm(content?: TContent): TForm;
  /** Converts the (valid) form into the content sent to the API. */
  toContent(form: TForm): TContent;
  /** Component that edits the content; receives the form from `createForm`. */
  readonly editor: Type<ModuleEditor<TForm>>;
  /** Component that lets the learner complete the module. */
  readonly player: Type<ModulePlayer<TContent>>;
}

export interface ModuleEditor<TForm extends FormGroup = FormGroup> {
  readonly form: InputSignal<TForm>;
}

/** The grade obtained on a module, e.g. 1 out of 1. */
export interface ModuleResult {
  score: number;
  maxScore: number;
}

export interface ModulePlayer<TContent = unknown> {
  readonly content: InputSignal<TContent>;
  /**
   * Emitted when the learner is done with the module and wants to continue,
   * with the grade obtained, or `null` for module types that are not graded.
   */
  readonly completed: OutputEmitterRef<ModuleResult | null>;
}
