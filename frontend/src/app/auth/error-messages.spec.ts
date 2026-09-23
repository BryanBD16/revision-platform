import { HttpErrorResponse } from '@angular/common/http';
import { authErrorMessages } from './error-messages';

describe('authErrorMessages', () => {
  function error(status: number, body: unknown): HttpErrorResponse {
    return new HttpErrorResponse({ status, error: body });
  }

  it('lists the validation errors', () => {
    const body = { errors: { email: ['Taken.'], password: ['Too short.', 'Too simple.'] } };

    expect(authErrorMessages(error(400, body))).toEqual(['Taken.', 'Too short.', 'Too simple.']);
  });

  it('shows the title of a refused sign-in', () => {
    expect(
      authErrorMessages(error(401, { title: 'The email or the password is incorrect.' })),
    ).toEqual(['The email or the password is incorrect.']);
  });

  it('explains the rate limit', () => {
    expect(authErrorMessages(error(429, null))).toEqual([
      'Too many attempts. Wait a minute and try again.',
    ]);
  });

  it('shows a general message for other errors', () => {
    expect(authErrorMessages(error(500, null))).toEqual([
      'Something went wrong. Please try again later.',
    ]);
  });
});
