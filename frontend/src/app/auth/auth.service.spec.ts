import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { firstValueFrom } from 'rxjs';
import { AuthService, CurrentUser } from './auth.service';

describe('AuthService', () => {
  let auth: AuthService;
  let http: HttpTestingController;

  const ada: CurrentUser = { id: 1, email: 'ada@example.com', displayName: 'Ada', roles: [] };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    auth = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  async function load(respond: () => void): Promise<void> {
    const loaded = firstValueFrom(auth.load());
    respond();
    await loaded;
  }

  it('loads the signed-in user', async () => {
    await load(() => http.expectOne({ method: 'GET', url: '/api/auth/me' }).flush(ada));

    expect(auth.user()).toEqual(ada);
    expect(auth.signedIn()).toBe(true);
  });

  it('treats an empty answer as a visitor', async () => {
    await load(() =>
      http.expectOne('/api/auth/me').flush(null, { status: 204, statusText: 'No Content' }),
    );

    expect(auth.user()).toBeNull();
    expect(auth.signedIn()).toBe(false);
  });

  it('treats a failure as a visitor', async () => {
    await load(() =>
      http.expectOne('/api/auth/me').flush(null, { status: 500, statusText: 'Error' }),
    );

    expect(auth.user()).toBeNull();
  });

  it('keeps the user after registering or signing in', () => {
    auth.register({ email: 'ada@example.com', password: 'p', displayName: 'Ada' }).subscribe();
    const register = http.expectOne({ method: 'POST', url: '/api/auth/register' });
    expect(register.request.body).toEqual({
      email: 'ada@example.com',
      password: 'p',
      displayName: 'Ada',
    });
    register.flush(ada);
    expect(auth.user()).toEqual(ada);

    auth.signIn({ email: 'ada@example.com', password: 'p' }).subscribe();
    http.expectOne({ method: 'POST', url: '/api/auth/sign-in' }).flush(ada);
    expect(auth.user()).toEqual(ada);
  });

  it('forgets the user after signing out', () => {
    auth.signIn({ email: 'ada@example.com', password: 'p' }).subscribe();
    http.expectOne('/api/auth/sign-in').flush(ada);

    auth.signOut().subscribe();
    http
      .expectOne({ method: 'POST', url: '/api/auth/sign-out' })
      .flush(null, { status: 204, statusText: 'No Content' });

    expect(auth.user()).toBeNull();
  });

  it('keeps the user when signing in fails', () => {
    auth.signIn({ email: 'ada@example.com', password: 'p' }).subscribe({ error: () => undefined });
    http.expectOne('/api/auth/sign-in').flush(null, { status: 401, statusText: 'Unauthorized' });

    expect(auth.user()).toBeNull();
  });
});
