import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Activity, RevisionModule } from '../activity';
import { ActivityPlayer } from './activity-player';

describe('ActivityPlayer', () => {
  let fixture: ComponentFixture<ActivityPlayer>;
  let http: HttpTestingController;
  let element: HTMLElement;

  function reading(position: number, body: string): RevisionModule {
    return { id: position + 1, position, type: 'reading', content: { title: null, body } };
  }

  function activity(modules: RevisionModule[]): Activity {
    return {
      id: 3,
      title: 'Cell biology',
      description: null,
      themes: [],
      modules,
      createdAt: '2026-09-23T03:06:18Z',
      updatedAt: '2026-09-23T03:06:18Z',
    };
  }

  async function load(value: Activity): Promise<void> {
    http.expectOne('/api/activities/3').flush(value);
    await fixture.whenStable();
  }

  async function clickButton(label: string): Promise<void> {
    [...element.querySelectorAll('button')].find((b) => b.textContent?.includes(label))!.click();
    await fixture.whenStable();
  }

  /** The cells of the grade table, row by row. */
  function gradeRows(): string[][] {
    return [...element.querySelectorAll('.grades tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent!.trim()),
    );
  }

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [ActivityPlayer],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    fixture = TestBed.createComponent(ActivityPlayer);
    http = TestBed.inject(HttpTestingController);
    element = fixture.nativeElement;
    fixture.componentRef.setInput('id', '3');
    fixture.detectChanges();
  });

  afterEach(() => http.verify());

  it('goes through the modules in order, then shows the completion', async () => {
    await load(activity([reading(0, 'First text'), reading(1, 'Second text')]));

    expect(element.textContent).toContain('Module 1 of 2');
    expect(element.textContent).toContain('First text');

    await clickButton('Continue');
    expect(element.textContent).toContain('Module 2 of 2');
    expect(element.textContent).toContain('Second text');
    expect(element.textContent).not.toContain('First text');

    await clickButton('Continue');
    expect(element.textContent).toContain('Activity completed');
    expect(element.textContent).toContain('all 2 modules');
  });

  it('shows that reading modules are not graded', async () => {
    await load(activity([reading(0, 'First text'), reading(1, 'Second text')]));
    await clickButton('Continue');
    await clickButton('Continue');

    expect(gradeRows()).toEqual([
      ['1. Reading', 'Not graded'],
      ['2. Reading', 'Not graded'],
    ]);
    expect(element.textContent).toContain('This activity has no graded modules.');
  });

  it('starts again from the first module', async () => {
    await load(activity([reading(0, 'First text')]));
    await clickButton('Continue');

    await clickButton('Start again');

    expect(element.textContent).toContain('Module 1 of 1');
    expect(element.textContent).toContain('First text');
  });

  it('shows a message for an activity without modules', async () => {
    await load(activity([]));

    expect(element.textContent).toContain('This activity has no modules.');
  });

  it('shows a not found message for an unknown activity', async () => {
    http.expectOne('/api/activities/3').flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(element.textContent).toContain('does not exist');
  });
});
