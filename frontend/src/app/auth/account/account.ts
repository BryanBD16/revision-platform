import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { AUTH_LIMITS, AuthService } from '../auth.service';
import { authErrorMessages } from '../error-messages';
import { passwordsMatch } from '../password-validators';

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule],
  templateUrl: './account.html',
})
export class Account {
  private readonly auth = inject(AuthService);

  protected readonly user = this.auth.user;
  protected readonly limits = AUTH_LIMITS;

  protected readonly form = new FormGroup(
    {
      currentPassword: new FormControl('', {
        nonNullable: true,
        validators: [Validators.required],
      }),
      newPassword: new FormControl('', {
        nonNullable: true,
        validators: [
          Validators.required,
          Validators.minLength(AUTH_LIMITS.passwordMinLength),
          Validators.maxLength(AUTH_LIMITS.passwordMaxLength),
        ],
      }),
      confirmation: new FormControl('', { nonNullable: true }),
    },
    { validators: [passwordsMatch('newPassword', 'confirmation')] },
  );

  protected readonly status = signal<'idle' | 'saving' | 'saved'>('idle');
  protected readonly errors = signal<string[]>([]);

  protected changePassword(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { currentPassword, newPassword } = this.form.getRawValue();
    this.status.set('saving');
    this.errors.set([]);
    this.auth.changePassword({ currentPassword, newPassword }).subscribe({
      next: () => {
        this.status.set('saved');
        this.form.reset();
      },
      error: (error: HttpErrorResponse) => {
        this.status.set('idle');
        this.errors.set(authErrorMessages(error));
      },
    });
  }
}
