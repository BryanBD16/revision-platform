import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Theme } from '../activity';
import { ActivityThemes } from './activity-themes';

describe('ActivityThemes', () => {
  let fixture: ComponentFixture<ActivityThemes>;

  async function create(courses: Theme[], themes: Theme[]): Promise<HTMLElement> {
    fixture = TestBed.createComponent(ActivityThemes);
    fixture.componentRef.setInput('courses', courses);
    fixture.componentRef.setInput('themes', themes);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  /** Each label with the names shown next to it. */
  function rows(element: HTMLElement): [string, string[]][] {
    return [...element.querySelectorAll('.row')].map((row) => [
      row.querySelector('dt')!.textContent!.trim(),
      [...row.querySelectorAll('li')].map((li) => li.textContent!.trim()),
    ]);
  }

  it('shows the course and the themes with labels', async () => {
    const element = await create(
      [{ id: 3, name: 'BIO 101' }],
      [
        { id: 1, name: 'Biology' },
        { id: 2, name: 'Cells' },
      ],
    );

    expect(rows(element)).toEqual([
      ['Course', ['BIO 101']],
      ['Themes', ['Biology', 'Cells']],
    ]);
  });

  it('uses a plural label for several courses', async () => {
    const element = await create(
      [
        { id: 3, name: 'BIO 101' },
        { id: 4, name: 'BIO 201' },
      ],
      [{ id: 1, name: 'Biology' }],
    );

    expect(rows(element)[0]).toEqual(['Courses', ['BIO 101', 'BIO 201']]);
  });

  it('shows only the themes when the activity has no course', async () => {
    const element = await create([], [{ id: 1, name: 'Biology' }]);

    expect(rows(element)).toEqual([['Themes', ['Biology']]]);
  });
});
