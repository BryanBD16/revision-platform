import { AbstractControl, ValidationErrors } from '@angular/forms';

/** Like `Validators.required`, but also rejects text made only of spaces. */
export function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}
