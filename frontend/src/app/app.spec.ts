import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { App } from './app';
import { AuthService } from './auth/auth.service';

describe('App', () => {
  let fixture: ComponentFixture<App>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [App],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function create(): Promise<HTMLElement> {
    fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  function signIn(): void {
    TestBed.inject(AuthService).signIn({ email: 'ada@example.com', password: 'p' }).subscribe();
    http
      .expectOne('/api/auth/sign-in')
      .flush({ id: 1, email: 'ada@example.com', displayName: 'Ada', roles: [], permissions: [] });
  }

  it('should render the application title', async () => {
    const element = await create();

    expect(element.querySelector('h1')?.textContent).toContain('Course Revision Platform');
  });

  it('offers visitors to sign in or create an account', async () => {
    const element = await create();

    const links = [...element.querySelectorAll('.user-nav a')].map((a) => a.getAttribute('href'));
    expect(links).toEqual(['/sign-in', '/register']);
  });

  it('shows the administration link only to the users who manage roles', async () => {
    TestBed.inject(AuthService).signIn({ email: 'grace@example.com', password: 'p' }).subscribe();
    http.expectOne('/api/auth/sign-in').flush({
      id: 2,
      email: 'grace@example.com',
      displayName: 'Grace',
      roles: ['admin'],
      permissions: ['manage-roles'],
    });
    const element = await create();

    expect(element.querySelector('.user-nav a')?.getAttribute('href')).toBe('/admin');
  });

  it('shows the signed-in user and signs out', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    signIn();
    const element = await create();

    expect(element.querySelector('.user-nav a')?.textContent).toContain('Ada');
    element.querySelector<HTMLButtonElement>('.user-nav button')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/auth/sign-out' })
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(element.querySelector('.user-nav')?.textContent).toContain('Sign in');
    expect(navigate).toHaveBeenCalledWith('/activities');
  });
});
