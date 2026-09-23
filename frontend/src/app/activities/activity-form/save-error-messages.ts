import { HttpErrorResponse } from '@angular/common/http';

/**
 * The messages to show when saving an activity failed: the validation errors (module
 * errors with the module number), the reason of a refusal, or `fallback`.
 */
export function saveErrorMessages(error: HttpErrorResponse, fallback: string): string[] {
  const fieldErrors: Record<string, string[]> | undefined = error.error?.errors;
  if (error.status === 400 && fieldErrors) {
    return Object.entries(fieldErrors).flatMap(([field, messages]) => {
      // Module errors are keyed like "modules[2].content"; show them with the module number.
      const moduleIndex = /^modules\[(\d+)\]/.exec(field)?.[1];
      const prefix = moduleIndex === undefined ? '' : `Module ${Number(moduleIndex) + 1}: `;
      return messages.map((message) => prefix + message);
    });
  }
  if (error.status === 403 && error.error?.title) {
    return [error.error.title];
  }
  return [fallback];
}
