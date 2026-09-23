import { HttpErrorResponse } from '@angular/common/http';

/** The messages to show for a failed authentication request. */
export function authErrorMessages(error: HttpErrorResponse): string[] {
  const fieldErrors: Record<string, string[]> | undefined = error.error?.errors;
  if (error.status === 400 && fieldErrors) {
    return Object.values(fieldErrors).flat();
  }
  if (error.status === 429) {
    return ['Too many attempts. Wait a minute and try again.'];
  }
  if ((error.status === 400 || error.status === 401) && error.error?.title) {
    return [error.error.title];
  }
  return ['Something went wrong. Please try again later.'];
}
