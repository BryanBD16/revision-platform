import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  Router,
  RouterStateSnapshot,
  UrlTree,
  provideRouter,
} from '@angular/router';
import { permissionGuard, signedInGuard } from './auth.guards';
import { AuthService, PERMISSIONS, Permission } from './auth.service';

describe('permissionGuard', () => {
  function run(signedIn: boolean, permissions: Permission[]): boolean | UrlTree {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            signedIn: signal(signedIn),
            can: (permission: Permission) => permissions.includes(permission),
          },
        },
      ],
    });
    return TestBed.runInInjectionContext(() =>
      permissionGuard(PERMISSIONS.manageRoles)(
        {} as ActivatedRouteSnapshot,
        { url: '/admin' } as RouterStateSnapshot,
      ),
    ) as boolean | UrlTree;
  }

  function serialize(result: boolean | UrlTree): string {
    return TestBed.inject(Router).serializeUrl(result as UrlTree);
  }

  it('lets in the users with the permission', () => {
    expect(run(true, [PERMISSIONS.manageRoles])).toBe(true);
  });

  it('sends the other users to the activities', () => {
    expect(serialize(run(true, [PERMISSIONS.publishActivities]))).toBe('/activities');
  });

  it('sends visitors to the sign-in page', () => {
    expect(serialize(run(false, []))).toBe('/sign-in?returnUrl=%2Fadmin');
  });
});

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
