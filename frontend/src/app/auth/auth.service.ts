import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, catchError, map, of, tap } from 'rxjs';

/** What a user is allowed to do; the API checks the same permissions. */
export const PERMISSIONS = {
  publishActivities: 'publish-activities',
  manageRoles: 'manage-roles',
} as const;

export type Permission = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export interface CurrentUser {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
  permissions: Permission[];
}

export interface RegisterRequest {
  email: string;
  password: string;
  displayName: string;
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

/** Limits enforced by the API (see docs/api.md). */
export const AUTH_LIMITS = {
  passwordMinLength: 12,
  passwordMaxLength: 128,
  displayNameMaxLength: 100,
  emailMaxLength: 256,
} as const;

/**
 * The signed-in user and the requests that change it. The session itself is an
 * HttpOnly cookie that the browser sends with each request.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/auth';

  private readonly currentUser = signal<CurrentUser | null>(null);

  /** The signed-in user, or null for a visitor. */
  readonly user = this.currentUser.asReadonly();
  readonly signedIn = computed(() => this.currentUser() !== null);

  /** Whether the signed-in user has a permission. Only hides what the API would refuse anyway. */
  can(permission: Permission): boolean {
    return this.currentUser()?.permissions.includes(permission) ?? false;
  }

  /** Loads the signed-in user. A failure leaves the visitor signed out. */
  load(): Observable<void> {
    return this.http.get<CurrentUser | null>(`${this.baseUrl}/me`).pipe(
      catchError(() => of(null)),
      map((user) => this.currentUser.set(user)),
    );
  }

  register(request: RegisterRequest): Observable<CurrentUser> {
    return this.http
      .post<CurrentUser>(`${this.baseUrl}/register`, request)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  signIn(request: SignInRequest): Observable<CurrentUser> {
    return this.http
      .post<CurrentUser>(`${this.baseUrl}/sign-in`, request)
      .pipe(tap((user) => this.currentUser.set(user)));
  }

  signOut(): Observable<void> {
    return this.http
      .post<void>(`${this.baseUrl}/sign-out`, null)
      .pipe(tap(() => this.currentUser.set(null)));
  }

  changePassword(request: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/change-password`, request);
  }
}
