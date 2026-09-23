import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Register } from './register';

describe('Register', () => {
  let fixture: ComponentFixture<Register>;
  let http: HttpTestingController;
  let element: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [Register],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Register);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function type(selector: string, value: string): void {
    const input = element.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    input.dispatchEvent(new Event('blur'));
  }

  function fill(password = 'correct horse battery', confirmation = password): void {
    type('#displayName', '  Ada Lovelace ');
    type('#email', ' ada@example.com ');
    type('#password', password);
    type('#confirmation', confirmation);
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('creates the account with the trimmed values', async () => {
    fill();

    await submit();
    const request = http.expectOne({ method: 'POST', url: '/api/auth/register' });
    expect(request.request.body).toEqual({
      displayName: 'Ada Lovelace',
      email: 'ada@example.com',
      password: 'correct horse battery',
    });
    request.flush({ id: 1, email: 'ada@example.com', displayName: 'Ada Lovelace', roles: [] });

    expect(navigate).toHaveBeenCalledWith('/activities');
  });

  it('requires a password of at least 12 characters', async () => {
    fill('eleven char');

    await submit();

    expect(element.textContent).toContain('The password must be at least 12 characters.');
    http.expectNone('/api/auth/register');
  });

  it('requires the same password twice', async () => {
    fill('correct horse battery', 'correct horse batterY');

    await submit();

    expect(element.textContent).toContain('The passwords are different.');
    http.expectNone('/api/auth/register');
  });

  it('shows the errors returned by the server', async () => {
    fill();

    await submit();
    http
      .expectOne('/api/auth/register')
      .flush(
        { errors: { email: ['An account already exists with this email.'] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(element.textContent).toContain('An account already exists with this email.');
  });
});
