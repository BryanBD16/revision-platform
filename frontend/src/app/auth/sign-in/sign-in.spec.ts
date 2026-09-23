import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { SignIn } from './sign-in';

describe('SignIn', () => {
  let fixture: ComponentFixture<SignIn>;
  let http: HttpTestingController;
  let element: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  async function create(returnUrl: string | null): Promise<void> {
    TestBed.configureTestingModule({
      imports: [SignIn],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(SignIn);
    fixture.componentRef.setInput('returnUrl', returnUrl);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

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

  it('requires the email and the password', async () => {
    await create(null);

    await submit();

    expect(element.textContent).toContain('The email is required.');
    expect(element.textContent).toContain('The password is required.');
    http.expectNone('/api/auth/sign-in');
  });

  it('signs in and opens the page the user came from', async () => {
    await create('/activities/new');
    type('#email', 'ada@example.com');
    type('#password', 'correct horse battery');

    await submit();
    const request = http.expectOne({ method: 'POST', url: '/api/auth/sign-in' });
    expect(request.request.body).toEqual({
      email: 'ada@example.com',
      password: 'correct horse battery',
    });
    request.flush({ id: 1, email: 'ada@example.com', displayName: 'Ada', roles: [], permissions: [] });

    expect(navigate).toHaveBeenCalledWith('/activities/new');
  });

  it('never opens another site after signing in', async () => {
    await create('https://evil.example');
    type('#email', 'ada@example.com');
    type('#password', 'correct horse battery');

    await submit();
    http.expectOne('/api/auth/sign-in').flush({ id: 1, email: 'a', displayName: 'Ada', roles: [], permissions: [] });

    expect(navigate).toHaveBeenCalledWith('/activities');
  });

  it('shows why signing in failed', async () => {
    await create(null);
    type('#email', 'ada@example.com');
    type('#password', 'wrong password');

    await submit();
    http
      .expectOne('/api/auth/sign-in')
      .flush(
        { title: 'The email or the password is incorrect.' },
        { status: 401, statusText: 'Unauthorized' },
      );
    await fixture.whenStable();

    expect(element.textContent).toContain('The email or the password is incorrect.');
    expect(navigate).not.toHaveBeenCalled();
  });
});
