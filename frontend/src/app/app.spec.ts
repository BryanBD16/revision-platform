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

    const links = [...element.querySelectorAll('.user-nav a')].map((a) => a.getAttribute('href'));
    expect(links).toContain('/admin');
  });

  /** The drop-down menu of the header whose summary is `title`. */
  function menu(element: HTMLElement, title: string): HTMLDetailsElement {
    return [...element.querySelectorAll<HTMLDetailsElement>('.nav-menu')].find((m) =>
      m.querySelector('summary')?.textContent?.includes(title),
    )!;
  }

  function menuLinks(element: HTMLElement, title: string): (string | null)[] {
    return [...menu(element, title).querySelectorAll('a')].map((a) => a.getAttribute('href'));
  }

  it('offers visitors to play the trivia game, without their scores', async () => {
    const element = await create();

    expect(menuLinks(element, 'Trivia game')).toEqual(['/trivia']);
  });

  it('links signed-in users to their trivia scores', async () => {
    signIn();
    const element = await create();

    expect(menuLinks(element, 'Trivia game')).toEqual(['/trivia', '/trivia/scores']);
  });

  it('offers visitors to take the typing test', async () => {
    const element = await create();

    expect(menuLinks(element, 'Typing test')).toEqual(['/typing', '/typing/wpm']);
  });

  it('links signed-in users to their typing results', async () => {
    signIn();
    const element = await create();

    expect(menuLinks(element, 'Typing test')).toEqual([
      '/typing',
      '/typing/results',
      '/typing/wpm',
    ]);
  });

  it('closes the trivia menu on a click outside of it or on Escape', async () => {
    const element = await create();
    const menu = element.querySelector<HTMLDetailsElement>('.nav-menu')!;

    menu.open = true;
    element.querySelector<HTMLElement>('.app-main')!.click();
    expect(menu.open).toBe(false);

    menu.open = true;
    menu.querySelector<HTMLElement>('.nav-menu-items')!.click();
    expect(menu.open).toBe(true);

    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    expect(menu.open).toBe(false);
  });

  it('closes the other drop-down menu when one is used', async () => {
    const element = await create();
    const trivia = menu(element, 'Trivia game');
    const typing = menu(element, 'Typing test');

    trivia.open = true;
    typing.open = true;
    typing.querySelector<HTMLElement>('.nav-menu-items')!.click();

    expect(trivia.open).toBe(false);
    expect(typing.open).toBe(true);
  });

  it('shows the signed-in user and signs out', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    signIn();
    const element = await create();

    expect(element.querySelector('.user-nav a[href="/account"]')?.textContent).toContain('Ada');
    expect(element.querySelector('.user-nav a[href="/results"]')?.textContent).toContain(
      'My results',
    );
    expect(element.querySelector('.user-nav a[href="/admin"]')).toBeNull();
    element.querySelector<HTMLButtonElement>('.user-nav button')!.click();
    http
      .expectOne({ method: 'POST', url: '/api/auth/sign-out' })
      .flush(null, { status: 204, statusText: 'No Content' });
    await fixture.whenStable();

    expect(element.querySelector('.user-nav')?.textContent).toContain('Sign in');
    expect(navigate).toHaveBeenCalledWith('/activities');
  });
});
