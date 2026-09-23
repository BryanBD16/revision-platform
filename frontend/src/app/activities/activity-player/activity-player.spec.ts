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

  function question(position: number, text: string): RevisionModule {
    return {
      id: position + 1,
      position,
      type: 'multiple-choice',
      content: {
        question: text,
        choices: [
          { id: 'right', text: 'Right answer' },
          { id: 'wrong', text: 'Wrong answer' },
        ],
        correctChoiceIds: ['right'],
        explanation: null,
      },
    };
  }

  function matching(position: number): RevisionModule {
    return {
      id: position + 1,
      position,
      type: 'matching',
      content: {
        instructions: null,
        pairs: [
          { id: 'p1', concept: 'Mitosis', definition: 'Two identical cells' },
          { id: 'p2', concept: 'Meiosis', definition: 'Gametes' },
        ],
      },
    };
  }

  async function answer(choiceText: string): Promise<void> {
    const label = [...element.querySelectorAll('.choice')].find((l) => l.textContent?.includes(choiceText));
    label!.querySelector('input')!.click();
    await fixture.whenStable();
    await clickButton('Check answer');
    await clickButton('Continue');
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

  it('shows the grade of each module and the total grade', async () => {
    await load(
      activity([reading(0, 'Text'), question(1, 'First question'), question(2, 'Second question')]),
    );

    await clickButton('Continue');
    await answer('Right answer');
    await answer('Wrong answer');

    expect(gradeRows()).toEqual([
      ['1. Reading', 'Not graded'],
      ['2. Multiple choice', '1 / 1'],
      ['3. Multiple choice', '0 / 1'],
    ]);
    expect(element.querySelector('.total-grade')?.textContent).toMatch(/Total grade:\s*1 \/ 2\s*\(50%\)/);
  });

  it('includes partial matching grades in the total', async () => {
    await load(activity([reading(0, 'Text'), question(1, 'Question'), matching(2)]));
    await clickButton('Continue');
    await answer('Right answer');

    // Match Mitosis correctly and Meiosis wrongly.
    for (const [concept, definition] of [['Mitosis', 'Two identical cells'], ['Meiosis', 'Two identical cells']]) {
      const label = [...element.querySelectorAll('label')].find((l) => l.textContent?.trim() === concept)!;
      const select = element.querySelector<HTMLSelectElement>(`#${label.htmlFor}`)!;
      select.value = [...select.options].find((o) => o.text.trim() === definition)!.value;
      select.dispatchEvent(new Event('change'));
      await fixture.whenStable();
    }
    await clickButton('Check answers');
    await clickButton('Continue');

    expect(gradeRows()).toEqual([
      ['1. Reading', 'Not graded'],
      ['2. Multiple choice', '1 / 1'],
      ['3. Matching', '1 / 2'],
    ]);
    expect(element.querySelector('.total-grade')?.textContent).toMatch(/2 \/ 3\s*\(67%\)/);
  });

  it('starts again from the first module', async () => {
    await load(activity([reading(0, 'First text')]));
    await clickButton('Continue');

    await clickButton('Start again');

    expect(element.textContent).toContain('Module 1 of 1');
    expect(element.querySelector('.grades')).toBeNull();
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
