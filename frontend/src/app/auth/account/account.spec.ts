import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AuthService } from '../auth.service';
import { Account } from './account';

describe('Account', () => {
  let fixture: ComponentFixture<Account>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Account],
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).signIn({ email: 'ada@example.com', password: 'p' }).subscribe();
    http
      .expectOne('/api/auth/sign-in')
      .flush({ id: 1, email: 'ada@example.com', displayName: 'Ada', roles: [] });
    fixture = TestBed.createComponent(Account);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function type(selector: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('shows the signed-in user', () => {
    expect(element.textContent).toContain('Ada');
    expect(element.textContent).toContain('ada@example.com');
  });

  it('changes the password', async () => {
    type('#currentPassword', 'correct horse battery');
    type('#newPassword', 'a brand new password');
    type('#confirmation', 'a brand new password');

    await submit();
    const request = http.expectOne({ method: 'POST', url: '/api/auth/change-password' });
    expect(request.request.body).toEqual({
      currentPassword: 'correct horse battery',
      newPassword: 'a brand new password',
    });
    request.flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(element.textContent).toContain('The password was changed.');
    expect(element.querySelector<HTMLInputElement>('#newPassword')!.value).toBe('');
  });

  it('shows why the password could not be changed', async () => {
    type('#currentPassword', 'wrong password!');
    type('#newPassword', 'a brand new password');
    type('#confirmation', 'a brand new password');

    await submit();
    http
      .expectOne('/api/auth/change-password')
      .flush(
        { errors: { currentPassword: ['The current password is incorrect.'] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(element.textContent).toContain('The current password is incorrect.');
  });
});
