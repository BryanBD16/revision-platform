import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/** Checks that the control `confirmation` of a form group repeats the control `password`. */
export function passwordsMatch(password: string, confirmation: string): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null =>
    group.get(password)?.value === group.get(confirmation)?.value
      ? null
      : { passwordsDiffer: true };
}
