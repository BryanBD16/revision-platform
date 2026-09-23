import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { signedInGuard } from './auth.guards';
import { AuthService } from './auth.service';

describe('signedInGuard', () => {
  function run(signedIn: boolean, url: string): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { signedIn: signal(signedIn) } },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      signedInGuard({} as ActivatedRouteSnapshot, { url } as RouterStateSnapshot),
    ) as boolean | UrlTree;
  }

  it('lets signed-in users in', () => {
    expect(run(true, '/account')).toBe(true);
  });

  it('sends visitors to the sign-in page, which brings them back', () => {
    const result = run(false, '/activities/new');

    expect(TestBed.inject(Router).serializeUrl(result as UrlTree)).toBe(
      '/sign-in?returnUrl=%2Factivities%2Fnew',
    );
  });
});
