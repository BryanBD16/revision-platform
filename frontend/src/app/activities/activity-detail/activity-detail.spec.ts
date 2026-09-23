import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
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

  it('shows the activity from the route id', async () => {
    http.expectOne('/api/activities/3').flush({
      id: 3,
      title: 'Cell biology',
      description: 'Chapter 3',
      themes: [{ id: 1, name: 'Biology' }],
      modules: [{ id: 1, position: 0, type: 'reading', content: { title: null, body: 'Text' } }],
      createdAt: '2026-09-23T03:06:18Z',
      updatedAt: '2026-09-23T03:06:18Z',
    });
    await fixture.whenStable();

    expect(text()).toContain('Cell biology');
    expect(text()).toContain('Chapter 3');
    expect(text()).toContain('Biology');
    expect(text()).toContain('1 module');
    const start = (fixture.nativeElement as HTMLElement).querySelector('a.button');
    expect(start?.textContent).toContain('Start activity');
    expect(start?.getAttribute('href')).toBe('/activities/3/play');
  });

  it('shows a not found message for an unknown activity', async () => {
    http.expectOne('/api/activities/3').flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(text()).toContain('does not exist');
  });
});
