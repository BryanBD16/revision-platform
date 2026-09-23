import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivityListQuery, Theme } from '../activity';
import { EMPTY_QUERY } from '../activity-list/activity-list-query';
import { ActivityFilters, TITLE_DEBOUNCE_MS } from './activity-filters';

describe('ActivityFilters', () => {
  let fixture: ComponentFixture<ActivityFilters>;
  let element: HTMLElement;
  let emitted: ActivityListQuery[];

  const themes: Theme[] = [
    { id: 1, name: 'Biology' },
    { id: 2, name: 'Cells' },
  ];
  const courses: Theme[] = [
    { id: 3, name: 'BIO 101' },
    { id: 4, name: 'BIO 201' },
  ];

  async function create(query: Partial<ActivityListQuery> = {}): Promise<void> {
    fixture = TestBed.createComponent(ActivityFilters);
    fixture.componentRef.setInput('query', { ...EMPTY_QUERY, ...query });
    fixture.componentRef.setInput('themes', themes);
    fixture.componentRef.setInput('courses', courses);
    element = fixture.nativeElement;
    emitted = [];
    fixture.componentInstance.queryChange.subscribe((q) => emitted.push(q));
    await fixture.whenStable();
  }

  function input(selector: string): HTMLInputElement {
    return element.querySelector<HTMLInputElement>(selector)!;
  }

  /** Types a value and leaves the field, which fires "change". */
  async function commit(selector: string, value: string): Promise<void> {
    input(selector).value = value;
    input(selector).dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  function suggestions(listId: string): string[] {
    return [...element.querySelectorAll<HTMLOptionElement>(`#${listId} option`)].map(
      (option) => option.value,
    );
  }

  afterEach(() => vi.useRealTimers());

  it('shows the current filters', async () => {
    await create({ title: 'cell', courseId: 4, themeIds: [2] });

    expect(input('#filter-title').value).toBe('cell');
    expect(input('#filter-course').value).toBe('BIO 201');
    expect(element.querySelector('[aria-label="Selected themes"]')?.textContent).toContain('Cells');
  });

  it('applies the title after the user stops typing, on the first page', async () => {
    await create({ page: 3 });
    vi.useFakeTimers();

    input('#filter-title').value = ' cel';
    input('#filter-title').dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(TITLE_DEBOUNCE_MS - 1);
    input('#filter-title').value = ' cell ';
    input('#filter-title').dispatchEvent(new Event('input'));
    expect(emitted).toEqual([]);
    vi.advanceTimersByTime(TITLE_DEBOUNCE_MS);

    expect(emitted).toEqual([{ ...EMPTY_QUERY, title: 'cell' }]);
  });

  it('suggests every course and applies the one typed, ignoring case', async () => {
    await create();

    expect(suggestions('filter-course-options')).toEqual(['BIO 101', 'BIO 201']);
    await commit('#filter-course', ' bio 201 ');

    expect(emitted).toEqual([{ ...EMPTY_QUERY, courseId: 4 }]);
  });

  it('applies a course picked in the suggestions without leaving the field', async () => {
    await create();

    input('#filter-course').value = 'BIO 101';
    input('#filter-course').dispatchEvent(new Event('input'));

    expect(emitted).toEqual([{ ...EMPTY_QUERY, courseId: 3 }]);
  });

  it('removes the course filter when the field is emptied', async () => {
    await create({ courseId: 3, page: 2 });

    await commit('#filter-course', '');

    expect(emitted).toEqual([EMPTY_QUERY]);
  });

  it('explains when no course has the typed name', async () => {
    await create({ courseId: 3 });

    await commit('#filter-course', 'CHEM 101');

    expect(element.textContent).toContain('No course is named “CHEM 101”.');
    expect(emitted).toEqual([EMPTY_QUERY]);
  });

  it('adds a theme to the selected themes and stops suggesting it', async () => {
    await create({ themeIds: [2] });

    expect(suggestions('filter-theme-options')).toEqual(['Biology']);
    await commit('#filter-theme', 'biology');

    expect(emitted).toEqual([{ ...EMPTY_QUERY, themeIds: [2, 1] }]);
    expect(input('#filter-theme').value).toBe('');
  });

  it('explains when no theme has the typed name', async () => {
    await create();

    await commit('#filter-theme', 'Chemistry');

    expect(element.textContent).toContain('No theme is named “Chemistry”.');
    expect(emitted).toEqual([]);
  });

  it('removes a selected theme', async () => {
    await create({ themeIds: [1, 2] });

    element.querySelector<HTMLButtonElement>('[aria-label="Remove the theme Biology"]')!.click();

    expect(emitted).toEqual([{ ...EMPTY_QUERY, themeIds: [2] }]);
  });

  it('clears all the filters', async () => {
    await create({ title: 'cell', courseId: 3, themeIds: [1], page: 2 });

    [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Clear'))!.click();

    expect(emitted).toEqual([EMPTY_QUERY]);
  });

  it('filters by visibility for signed-in users', async () => {
    await create({ page: 2 });
    fixture.componentRef.setInput('showVisibility', true);
    await fixture.whenStable();
    const select = element.querySelector<HTMLSelectElement>('#filter-visibility')!;

    select.value = 'private';
    select.dispatchEvent(new Event('change'));

    expect(emitted).toEqual([{ ...EMPTY_QUERY, visibility: 'private' }]);
  });

  it('does not offer the visibility filter to visitors', async () => {
    await create();

    expect(element.querySelector('#filter-visibility')).toBeNull();
  });

  it('offers to clear only when a filter is set', async () => {
    await create();

    expect(element.textContent).not.toContain('Clear filters');
  });
});
