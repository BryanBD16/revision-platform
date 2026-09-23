import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { ActivityCreate } from './activity-create';

describe('ActivityCreate', () => {
  let fixture: ComponentFixture<ActivityCreate>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ActivityCreate],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ActivityCreate);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function type(selector: string, value: string): void {
    const input = element.querySelector<HTMLInputElement | HTMLTextAreaElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  async function addReadingModule(body: string): Promise<void> {
    element.querySelector<HTMLSelectElement>('#new-module-type')!.value = 'reading';
    [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Add module'))!.click();
    await fixture.whenStable();
    const bodies = element.querySelectorAll<HTMLTextAreaElement>('textarea[id$="-body"]');
    const textarea = bodies[bodies.length - 1];
    textarea.value = body;
    textarea.dispatchEvent(new Event('input'));
  }

  function fillActivity(): void {
    type('#title', 'Cell biology');
    type('#themes', 'Biology');
  }

  function click(label: string): void {
    element.querySelector<HTMLButtonElement>(`button[aria-label="${label}"]`)!.click();
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('shows validation errors and sends nothing when the form is incomplete', async () => {
    type('#title', '   ');

    await submit();

    expect(element.textContent).toContain('The title is required.');
    expect(element.textContent).toContain('At least one theme is required.');
    expect(element.textContent).toContain('At least one module is required.');
    http.expectNone('/api/activities');
  });

  it('does not require a course', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fillActivity();
    await addReadingModule('Text');

    await submit();

    const request = http.expectOne('/api/activities');
    expect(request.request.body.courses).toEqual([]);
    request.flush({ id: 1 });
  });

  it('rejects a course name that is too long', async () => {
    type('#courses', 'a'.repeat(101));
    await fixture.whenStable();

    expect(element.textContent).toContain('Course names must be at most 100 characters.');
  });

  it('validates the content of each module', async () => {
    fillActivity();
    await addReadingModule('   ');

    await submit();

    expect(element.textContent).toContain('The text to read is required.');
    http.expectNone('/api/activities');
  });

  it('creates the activity and opens it', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    type('#title', '  Cell biology ');
    type('#description', '  ');
    type('#themes', 'Biology, cells, , biology');
    type('#courses', ' BIO 101, bio 101 ');
    await addReadingModule('  Some text ');

    await submit();

    const request = http.expectOne({ method: 'POST', url: '/api/activities' });
    expect(request.request.body).toEqual({
      title: 'Cell biology',
      description: null,
      themes: ['Biology', 'cells'],
      courses: ['BIO 101'],
      visibility: 'private',
      modules: [{ type: 'reading', content: { title: null, body: 'Some text' } }],
    });
    request.flush({ id: 5 });
    expect(navigate).toHaveBeenCalledWith(['/activities', 5]);
  });

  it('tells a user who cannot publish that the activity will be private', () => {
    expect(element.querySelector('input[type="radio"]')).toBeNull();
    expect(element.textContent).toContain('This activity is private');
  });

  it('sends modules in the order shown, after moving and removing them', async () => {
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fillActivity();
    await addReadingModule('First');
    await addReadingModule('Second');
    await addReadingModule('Third');

    click('Move module 3 up');
    click('Remove module 1');
    await submit();

    const request = http.expectOne('/api/activities');
    const modules = request.request.body.modules as { content: { body: string } }[];
    expect(modules.map((m) => m.content.body)).toEqual(['Third', 'Second']);
    request.flush({ id: 1 });
  });

  it('shows validation messages returned by the server', async () => {
    fillActivity();
    await addReadingModule('Text');

    await submit();
    http
      .expectOne('/api/activities')
      .flush(
        {
          errors: {
            title: ['The title must be at most 200 characters.'],
            'modules[0].content': ['The text to read is required.'],
          },
        },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(element.textContent).toContain('The title must be at most 200 characters.');
    expect(element.textContent).toContain('Module 1: The text to read is required.');
    expect(element.querySelector<HTMLButtonElement>('button[type="submit"]')!.disabled).toBe(false);
  });
});

describe('ActivityCreate for a user who can publish', () => {
  let fixture: ComponentFixture<ActivityCreate>;
  let http: HttpTestingController;
  let element: HTMLElement;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [ActivityCreate],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).signIn({ email: 'grace@example.com', password: 'p' }).subscribe();
    http.expectOne('/api/auth/sign-in').flush({
      id: 1,
      email: 'grace@example.com',
      displayName: 'Grace',
      roles: ['admin'],
      permissions: ['publish-activities'],
    });
    vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(ActivityCreate);
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  function radio(value: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`)!;
  }

  async function createActivity(): Promise<unknown> {
    for (const [selector, value] of [
      ['#title', 'Cell biology'],
      ['#themes', 'Biology'],
    ]) {
      const input = element.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    }
    element.querySelector<HTMLSelectElement>('#new-module-type')!.value = 'reading';
    [...element.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Add module'))!
      .click();
    await fixture.whenStable();
    const body = element.querySelector<HTMLTextAreaElement>('textarea[id$="-body"]')!;
    body.value = 'Text';
    body.dispatchEvent(new Event('input'));
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    const request = http.expectOne('/api/activities');
    request.flush({ id: 1 });
    return request.request.body.visibility;
  }

  it('creates a private activity by default', async () => {
    expect(radio('private').checked).toBe(true);

    expect(await createActivity()).toBe('private');
  });

  it('creates a public activity when chosen', async () => {
    radio('public').click();
    await fixture.whenStable();

    expect(await createActivity()).toBe('public');
  });
});
