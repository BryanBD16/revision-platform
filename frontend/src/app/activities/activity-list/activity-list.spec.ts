import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivitySummary } from '../activity';
import { ActivityList } from './activity-list';

describe('ActivityList', () => {
  let fixture: ComponentFixture<ActivityList>;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActivityList],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ActivityList);
    http = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  function text(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }

  it('shows each activity with its themes, courses and a link to it', async () => {
    const activities: ActivitySummary[] = [
      {
        id: 7,
        title: 'Cell biology',
        description: null,
        themes: [
          { id: 1, name: 'Biology' },
          { id: 2, name: 'Cells' },
        ],
        courses: [{ id: 3, name: 'BIO 101' }],
        moduleCount: 2,
        createdAt: '2026-09-23T03:06:18Z',
        updatedAt: '2026-09-23T03:06:18Z',
      },
    ];

    http.expectOne('/api/activities').flush(activities);
    await fixture.whenStable();

    const link = (fixture.nativeElement as HTMLElement).querySelector<HTMLAnchorElement>(
      '.activity-title',
    );
    expect(link?.textContent).toContain('Cell biology');
    expect(link?.getAttribute('href')).toBe('/activities/7');
    expect(text()).toContain('Biology');
    expect(text()).toContain('Cells');
    expect((fixture.nativeElement as HTMLElement).querySelector('.course')?.textContent).toContain(
      'BIO 101',
    );
    expect(text()).toContain('2 modules');
  });

  it('shows a message when there are no activities', async () => {
    http.expectOne('/api/activities').flush([]);
    await fixture.whenStable();

    expect(text()).toContain('No activities yet');
  });

  it('shows an error when loading fails', async () => {
    http.expectOne('/api/activities').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(text()).toContain('could not be loaded');
  });
});
