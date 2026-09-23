import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { Activity } from '../activity';
import { ActivityEdit } from './activity-edit';

describe('ActivityEdit', () => {
  let fixture: ComponentFixture<ActivityEdit>;
  let http: HttpTestingController;
  let element: HTMLElement;
  let navigate: ReturnType<typeof vi.spyOn>;

  const activity: Activity = {
    id: 3,
    title: 'Cell biology',
    description: 'Chapter 3',
    themes: [
      { id: 1, name: 'Biology' },
      { id: 2, name: 'Cells' },
    ],
    courses: [{ id: 5, name: 'BIO 101' }],
    visibility: 'private',
    modules: [
      { id: 10, position: 0, type: 'reading', content: { title: null, body: 'First' } },
      { id: 11, position: 1, type: 'reading', content: { title: 'Second', body: 'Second text' } },
    ],
    createdAt: '2026-09-23T03:06:18Z',
    updatedAt: '2026-09-23T03:06:18Z',
    canEdit: true,
    lastEditedBy: null,
  };

  async function open(value: Activity, permissions: string[] = []): Promise<void> {
    TestBed.configureTestingModule({
      imports: [ActivityEdit],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    TestBed.inject(AuthService).signIn({ email: 'ada@example.com', password: 'p' }).subscribe();
    http
      .expectOne('/api/auth/sign-in')
      .flush({ id: 1, email: 'ada@example.com', displayName: 'Ada', roles: [], permissions });
    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);

    fixture = TestBed.createComponent(ActivityEdit);
    fixture.componentRef.setInput('id', '3');
    element = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne('/api/activities/3').flush(value);
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  function input(selector: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>(selector)!;
  }

  async function submit(): Promise<void> {
    element.querySelector('form')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
  }

  it('fills the form with the activity', async () => {
    await open(activity);

    expect(input('#title').value).toBe('Cell biology');
    expect(element.querySelector<HTMLTextAreaElement>('#description')!.value).toBe('Chapter 3');
    expect(input('#themes').value).toBe('Biology, Cells');
    expect(input('#courses').value).toBe('BIO 101');
    const bodies = [...element.querySelectorAll<HTMLTextAreaElement>('textarea[id$="-body"]')];
    expect(bodies.map((body) => body.value)).toEqual(['First', 'Second text']);
  });

  it('saves the changes, keeping the ids of the modules, and opens the activity', async () => {
    await open(activity);
    input('#title').value = 'Cell biology, edited';
    input('#title').dispatchEvent(new Event('input'));
    element.querySelector<HTMLButtonElement>('button[aria-label="Move module 2 up"]')!.click();
    await fixture.whenStable();

    await submit();
    const request = http.expectOne({ method: 'PUT', url: '/api/activities/3' });
    expect(request.request.body).toEqual({
      title: 'Cell biology, edited',
      description: 'Chapter 3',
      themes: ['Biology', 'Cells'],
      courses: ['BIO 101'],
      visibility: 'private',
      modules: [
        { id: 11, type: 'reading', content: { title: 'Second', body: 'Second text' } },
        { id: 10, type: 'reading', content: { title: null, body: 'First' } },
      ],
    });
    request.flush({ ...activity, title: 'Cell biology, edited' });

    expect(navigate).toHaveBeenCalledWith(['/activities', 3]);
  });

  it('keeps the visibility of an activity for a user who cannot publish', async () => {
    await open({ ...activity, visibility: 'public' });

    expect(element.querySelector('input[type="radio"]')).toBeNull();
    await submit();

    const request = http.expectOne('/api/activities/3');
    expect(request.request.body.visibility).toBe('public');
    request.flush(activity);
  });

  it('lets a user who can publish change the visibility', async () => {
    await open(activity, ['publish-activities', 'manage-public-activities']);

    element.querySelector<HTMLInputElement>('input[type="radio"][value="public"]')!.click();
    await submit();

    const request = http.expectOne('/api/activities/3');
    expect(request.request.body.visibility).toBe('public');
    request.flush(activity);
  });

  it('shows why the changes could not be saved', async () => {
    await open(activity);

    await submit();
    http
      .expectOne('/api/activities/3')
      .flush(
        { errors: { 'modules[1].id': ['This module is not part of the activity.'] } },
        { status: 400, statusText: 'Bad Request' },
      );
    await fixture.whenStable();

    expect(element.textContent).toContain('Module 2: This module is not part of the activity.');
    expect(navigate).not.toHaveBeenCalled();
  });

  it('does not show the form to someone who cannot edit the activity', async () => {
    await open({ ...activity, canEdit: false });

    expect(element.querySelector('form')).toBeNull();
    expect(element.textContent).toContain('You cannot edit this activity.');
  });
});
