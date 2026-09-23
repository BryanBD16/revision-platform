import { InputSignal, Type } from '@angular/core';
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
  /** Creates the form that edits this module's content, with its validators. */
  createForm(): TForm;
  /** Converts the (valid) form into the content sent to the API. */
  toContent(form: TForm): TContent;
  /** Component that edits the content; receives the form from `createForm`. */
  readonly editor: Type<ModuleEditor<TForm>>;
}

export interface ModuleEditor<TForm extends FormGroup = FormGroup> {
  readonly form: InputSignal<TForm>;
}
