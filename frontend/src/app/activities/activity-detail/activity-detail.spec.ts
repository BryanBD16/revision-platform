import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { Activity } from '../activity';
import { ActivityDetail } from './activity-detail';

describe('ActivityDetail', () => {
  let fixture: ComponentFixture<ActivityDetail>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActivityDetail],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ActivityDetail);
    http = TestBed.inject(HttpTestingController);
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  const activity: Activity = {
    id: 3,
    title: 'Cell biology',
    description: null,
    themes: [{ id: 1, name: 'Biology' }],
    courses: [],
    visibility: 'public',
    modules: [{ id: 1, position: 0, type: 'reading', content: { title: null, body: 'Text' } }],
    createdAt: '2026-09-23T03:06:18Z',
    updatedAt: '2026-09-24T10:00:00Z',
    canEdit: false,
    lastEditedBy: null,
  };

  async function load(value: Activity): Promise<HTMLElement> {
    http.expectOne('/api/activities/3').flush(value);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  it('shows the activity from the route id', async () => {
    http.expectOne('/api/activities/3').flush({
      id: 3,
      title: 'Cell biology',
      description: 'Chapter 3',
      themes: [{ id: 1, name: 'Biology' }],
      courses: [{ id: 2, name: 'BIO 101' }],
      visibility: 'private',
      modules: [{ id: 1, position: 0, type: 'reading', content: { title: null, body: 'Text' } }],
      createdAt: '2026-09-23T03:06:18Z',
      updatedAt: '2026-09-23T03:06:18Z',
      canEdit: false,
      lastEditedBy: null,
    });
    await fixture.whenStable();

    expect(text()).toContain('Cell biology');
    expect(text()).toContain('Chapter 3');
    expect(text()).toContain('Biology');
    const themes = (fixture.nativeElement as HTMLElement).querySelector('app-activity-themes');
    expect(themes?.textContent).toContain('Course');
    expect(themes?.textContent).toContain('BIO 101');
    expect(text()).toContain('1 module');
    const start = (fixture.nativeElement as HTMLElement).querySelector('a.button');
    expect(start?.textContent).toContain('Start activity');
    expect(start?.getAttribute('href')).toBe('/activities/3/play');
  });

  it('offers to edit and delete only to the people who can change the activity', async () => {
    const element = await load(activity);

    expect(element.querySelector('.owner-actions')).toBeNull();
  });

  it('links to the edit page and says who last edited a public activity', async () => {
    const element = await load({
      ...activity,
      canEdit: true,
      lastEditedBy: { id: 7, displayName: 'Grace' },
    });

    const edit = element.querySelector<HTMLAnchorElement>('.owner-actions a');
    expect(edit?.getAttribute('href')).toBe('/activities/3/edit');
    expect(text()).toContain('Last edited by Grace');
  });

  it('deletes the activity after confirmation and goes back to the list', async () => {
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const element = await load({ ...activity, canEdit: true });

    element.querySelector<HTMLButtonElement>('.button-danger')!.click();

    expect(confirm).toHaveBeenCalledWith('Delete "Cell biology" for good? This cannot be undone.');
    http.expectOne({ method: 'DELETE', url: '/api/activities/3' }).flush(null);
    expect(navigate).toHaveBeenCalledWith(['/activities']);
    confirm.mockRestore();
  });

  it('deletes nothing when the confirmation is cancelled', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const element = await load({ ...activity, canEdit: true });

    element.querySelector<HTMLButtonElement>('.button-danger')!.click();

    http.expectNone('/api/activities/3');
    confirm.mockRestore();
  });

  it('shows why the activity could not be deleted', async () => {
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true);
    const element = await load({ ...activity, canEdit: true });

    element.querySelector<HTMLButtonElement>('.button-danger')!.click();
    http
      .expectOne({ method: 'DELETE', url: '/api/activities/3' })
      .flush(
        { title: 'Only admins can delete public activities.' },
        { status: 403, statusText: 'Forbidden' },
      );
    await fixture.whenStable();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain(
      'Only admins can delete',
    );
    confirm.mockRestore();
  });

  it('shows a not found message for an unknown activity', async () => {
    http.expectOne('/api/activities/3').flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(text()).toContain('does not exist');
  });
});
