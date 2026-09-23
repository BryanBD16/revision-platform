import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ACTIVITY_LIMITS } from '../activity';
import { ActivityApi } from '../activity-api';
import { parseThemeNames } from '../theme-names';

function notBlank(control: AbstractControl<string>): ValidationErrors | null {
  return control.value.trim() ? null : { required: true };
}

function validThemeNames(control: AbstractControl<string>): ValidationErrors | null {
  const names = parseThemeNames(control.value);
  if (names.length === 0) {
    return { required: true };
  }
  if (names.some((name) => name.length > ACTIVITY_LIMITS.themeNameMaxLength)) {
    return { themeTooLong: true };
  }
  return null;
}

@Component({
  selector: 'app-activity-create',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './activity-create.html',
})
export class ActivityCreate {
  private readonly activityApi = inject(ActivityApi);
  private readonly router = inject(Router);

  protected readonly limits = ACTIVITY_LIMITS;

  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(ACTIVITY_LIMITS.titleMaxLength)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(ACTIVITY_LIMITS.descriptionMaxLength)],
    }),
    themes: new FormControl('', { nonNullable: true, validators: [validThemeNames] }),
  });

  protected readonly submitting = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, themes } = this.form.getRawValue();
    this.submitting.set(true);
    this.serverErrors.set([]);

    this.activityApi
      .create({
        title: title.trim(),
        description: description.trim() || null,
        themes: parseThemeNames(themes),
      })
      .subscribe({
        next: (activity) => this.router.navigate(['/activities', activity.id]),
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.serverErrors.set(this.errorMessages(error));
        },
      });
  }

  private errorMessages(error: HttpErrorResponse): string[] {
    const fieldErrors: Record<string, string[]> | undefined = error.error?.errors;
    if (error.status === 400 && fieldErrors) {
      return Object.values(fieldErrors).flat();
    }
    return ['The activity could not be created. Please try again later.'];
  }
}
