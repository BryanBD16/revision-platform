import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, distinctUntilChanged, map } from 'rxjs';
import { AuthService } from '../../auth/auth.service';
import { AdminApi, AdminUser, Page, RoleChange } from '../admin-api';

/** Delay after the last key press before the users are searched. */
export const SEARCH_DEBOUNCE_MS = 300;

/** The users with their roles, and the audit trail of the role changes. */
@Component({
  selector: 'app-admin-page',
  imports: [DatePipe, ReactiveFormsModule],
  templateUrl: './admin-page.html',
  styleUrl: './admin-page.css',
})
export class AdminPage {
  private readonly adminApi = inject(AdminApi);
  private readonly auth = inject(AuthService);

  protected readonly search = new FormControl('', { nonNullable: true });
  protected readonly roles = signal<string[]>([]);
  protected readonly users = signal<Page<AdminUser> | null>(null);
  protected readonly changes = signal<Page<RoleChange> | null>(null);
  protected readonly busy = signal(false);
  protected readonly error = signal<string | null>(null);

  private usersPage = 1;
  private changesPage = 1;

  constructor() {
    this.adminApi.getRoles().subscribe((roles) => this.roles.set(roles));
    this.loadUsers();
    this.loadChanges();

    this.search.valueChanges
      .pipe(
        debounceTime(SEARCH_DEBOUNCE_MS),
        map((value) => value.trim()),
        distinctUntilChanged(),
        takeUntilDestroyed(),
      )
      .subscribe(() => {
        this.usersPage = 1;
        this.loadUsers();
      });
  }

  protected isCurrentUser(user: AdminUser): boolean {
    return user.id === this.auth.user()?.id;
  }

  protected hasNextPage(page: Page<unknown>): boolean {
    return page.page * page.pageSize < page.totalCount;
  }

  protected showUsersPage(page: number): void {
    this.usersPage = page;
    this.loadUsers();
  }

  protected showChangesPage(page: number): void {
    this.changesPage = page;
    this.loadChanges();
  }

  /** Grants or revokes a role after confirmation, when its checkbox is clicked. */
  protected toggleRole(user: AdminUser, role: string, event: Event): void {
    const checkbox = event.target as HTMLInputElement;
    const grant = checkbox.checked;
    const question = grant
      ? `Give the role "${role}" to ${user.displayName} (${user.email})?`
      : `Remove the role "${role}" from ${user.displayName} (${user.email})?`;
    if (!confirm(question)) {
      checkbox.checked = !grant;
      return;
    }

    this.busy.set(true);
    this.error.set(null);
    const request = grant
      ? this.adminApi.grantRole(user.id, role)
      : this.adminApi.revokeRole(user.id, role);
    request.subscribe({
      next: () => {
        this.busy.set(false);
        this.loadUsers();
        this.showChangesPage(1);
      },
      error: (error: HttpErrorResponse) => {
        this.busy.set(false);
        checkbox.checked = !grant;
        this.error.set(
          error.error?.title ?? 'The role could not be changed. Please try again later.',
        );
      },
    });
  }

  private loadUsers(): void {
    this.adminApi.getUsers(this.search.value.trim(), this.usersPage).subscribe({
      next: (page) => this.users.set(page),
      error: () => this.error.set('The users could not be loaded. Please try again later.'),
    });
  }

  private loadChanges(): void {
    this.adminApi.getRoleChanges(this.changesPage).subscribe({
      next: (page) => this.changes.set(page),
      error: () => this.error.set('The role changes could not be loaded. Please try again later.'),
    });
  }
}
