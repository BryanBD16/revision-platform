import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, input, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { notBlank } from '../../shared/validators';
import { AUTH_LIMITS, AuthService } from '../auth.service';
import { authErrorMessages } from '../error-messages';
import { passwordsMatch } from '../password-validators';
import { safeReturnUrl } from '../return-url';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  /** Bound from the `returnUrl` query parameter: the page to open after registering. */
  readonly returnUrl = input<string | null>(null);

  protected readonly limits = AUTH_LIMITS;

  protected readonly form = new FormGroup(
    {
      displayName: new FormControl('', {
        nonNullable: true,
        validators: [notBlank, Validators.maxLength(AUTH_LIMITS.displayNameMaxLength)],
      }),
      email: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.email,
          Validators.maxLength(AUTH_LIMITS.emailMaxLength),
        ],
      }),
      password: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(AUTH_LIMITS.passwordMinLength),
          Validators.maxLength(AUTH_LIMITS.passwordMaxLength),
        ],
      }),
      confirmation: new FormControl('', { nonNullable: true }),
    },
    { validators: [passwordsMatch('password', 'confirmation')] },
  );

  protected readonly submitting = signal(false);
  protected readonly errors = signal<string[]>([]);

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { displayName, email, password } = this.form.getRawValue();
    this.submitting.set(true);
    this.errors.set([]);
    this.auth
      .register({ displayName: displayName.trim(), email: email.trim(), password })
      .subscribe({
        next: () => this.router.navigateByUrl(safeReturnUrl(this.returnUrl())),
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.errors.set(authErrorMessages(error));
        },
      });
  }
}
