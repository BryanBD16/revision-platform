import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

/** Sends visitors to the sign-in page, which brings them back afterwards. */
export const signedInGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).signedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};
