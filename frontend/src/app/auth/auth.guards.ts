import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService, Permission } from './auth.service';

/** Sends visitors to the sign-in page, which brings them back afterwards. */
export const signedInGuard: CanActivateFn = (_route, state) => {
  if (inject(AuthService).signedIn()) {
    return true;
  }
  return inject(Router).createUrlTree(['/sign-in'], { queryParams: { returnUrl: state.url } });
};

/** Lets in the users with a permission; sends visitors to sign in and others to the activities. */
export function permissionGuard(permission: Permission): CanActivateFn {
  return (route, state) => {
    const signedIn = signedInGuard(route, state);
    if (signedIn !== true) {
      return signedIn;
    }
    return inject(AuthService).can(permission) || inject(Router).createUrlTree(['/activities']);
  };
}
