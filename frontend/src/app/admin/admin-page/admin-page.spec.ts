import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../../auth/auth.service';
import { AdminUser, Page, RoleChange } from '../admin-api';
import { AdminPage, SEARCH_DEBOUNCE_MS } from './admin-page';

describe('AdminPage', () => {
  let fixture: ComponentFixture<AdminPage>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const grace: AdminUser = {
    id: 1,
    email: 'grace@example.com',
    displayName: 'Grace',
    roles: ['admin'],
    createdAt: '2026-09-23T03:06:18Z',
    lockedOut: false,
  };
  const ada: AdminUser = {
    ...grace,
    id: 2,
    email: 'ada@example.com',
    displayName: 'Ada',
    roles: [],
  };

  function page<T>(items: T[], totalCount = items.length, pageNumber = 1): Page<T> {
    return { items, page: pageNumber, pageSize: 20, totalCount };
  }

  const change: RoleChange = {
    id: 1,
    user: { id: 2, email: 'ada@example.com', displayName: 'Ada' },
    role: 'admin',
    action: 'granted',
    changedBy: null,
    origin: 'command line (bob@server)',
    changedAt: '2026-09-23T03:06:18Z',
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AdminPage],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).signIn({ email: 'grace@example.com', password: 'p' }).subscribe();
    http
      .expectOne('/api/auth/sign-in')
      .flush({ ...grace, roles: ['admin'], permissions: ['manage-roles'] });

    fixture = TestBed.createComponent(AdminPage);
    element = fixture.nativeElement;
    http.expectOne('/api/admin/roles').flush(['admin']);
    // 25 users in all: the first page shows 2 of them and links to the next page.
    http.expectOne('/api/admin/users?page=1').flush(page([ada, grace], 25));
    http.expectOne('/api/admin/role-changes?page=1').flush(page([change]));
    await fixture.whenStable();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    http.verify();
  });

  function checkbox(email: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>(`input[aria-label="Role admin of ${email}"]`)!;
  }

  async function click(input: HTMLInputElement): Promise<void> {
    input.click();
    await fixture.whenStable();
  }

  it('shows the users with a checkbox per role', () => {
    const rows = [...element.querySelectorAll('tbody tr')];

    expect(rows.map((row) => row.querySelector('strong')?.textContent)).toEqual(['Ada', 'Grace']);
    expect(checkbox('ada@example.com').checked).toBe(false);
    expect(checkbox('grace@example.com').checked).toBe(true);
    expect(rows[1].textContent).toContain('(you)');
  });

  it('shows the role changes, including those made by a server command', () => {
    const text = element.querySelector('.role-changes')?.textContent ?? '';

    expect(text).toContain('A server command');
    expect(text).toContain('gave the role admin to Ada (ada@example.com)');
    expect(text).toContain('command line (bob@server)');
  });

  it('grants a role after confirmation and reloads the lists', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);

    await click(checkbox('ada@example.com'));

    expect(confirm).toHaveBeenCalledWith('Give the role "admin" to Ada (ada@example.com)?');
    http.expectOne({ method: 'PUT', url: '/api/admin/users/2/roles/admin' }).flush(null);
    http.expectOne('/api/admin/users?page=1').flush(page([{ ...ada, roles: ['admin'] }, grace]));
    http.expectOne('/api/admin/role-changes?page=1').flush(page([change]));
    await fixture.whenStable();
    expect(checkbox('ada@example.com').checked).toBe(true);
  });

  it('changes nothing when the confirmation is cancelled', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(false);

    await click(checkbox('ada@example.com'));

    http.expectNone('/api/admin/users/2/roles/admin');
    expect(checkbox('ada@example.com').checked).toBe(false);
  });

  it('shows why a role could not be removed and restores the checkbox', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    await click(checkbox('grace@example.com'));
    http
      .expectOne({ method: 'DELETE', url: '/api/admin/users/1/roles/admin' })
      .flush(
        { title: 'You cannot remove your own admin role. Ask another admin.' },
        { status: 409, statusText: 'Conflict' },
      );
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'You cannot remove your own admin role.',
    );
    expect(checkbox('grace@example.com').checked).toBe(true);
  });

  it('searches the users after the admin stops typing, from the first page', async () => {
    vi.useFakeTimers();
    const search = element.querySelector<HTMLInputElement>('#user-search')!;

    search.value = ' ada ';
    search.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(SEARCH_DEBOUNCE_MS);

    http.expectOne('/api/admin/users?page=1&search=ada').flush(page([ada]));
  });

  it('shows the next page of users', async () => {
    [...element.querySelectorAll<HTMLButtonElement>('.pagination button')]
      .find((b) => b.textContent?.includes('Next'))!
      .click();

    http.expectOne('/api/admin/users?page=2').flush(page([grace], 25, 2));
    await fixture.whenStable();
    expect(element.querySelector('tbody')?.textContent).not.toContain('Ada');
  });
});
