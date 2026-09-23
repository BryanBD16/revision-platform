import { Component, computed, effect, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { debounceTime, map } from 'rxjs';
import { ActivityListQuery, Theme, Visibility } from '../activity';
import { EMPTY_QUERY, hasFilters } from '../activity-list/activity-list-query';

/** Delay after the last key press before the title filter is applied. */
export const TITLE_DEBOUNCE_MS = 300;

/**
 * Whether an input event comes from picking a suggestion of a datalist (or from
 * clearing the field), rather than from typing: Chrome marks it as a replacement
 * and Firefox sends a plain Event instead of an InputEvent.
 */
function isPickOrClear(event: Event): boolean {
  const input = event.target as HTMLInputElement;
  return (
    input.value === '' ||
    !(event instanceof InputEvent) ||
    event.inputType === 'insertReplacementText'
  );
}

function findByName(themes: Theme[], name: string): Theme | undefined {
  const key = name.trim().toLocaleLowerCase();
  return themes.find((theme) => theme.name.toLocaleLowerCase() === key);
}

/**
 * Filters of the activity list: title search, one course and any number of
 * themes. Emits the new query, back on the first page, when a filter changes.
 */
@Component({
  selector: 'app-activity-filters',
  imports: [ReactiveFormsModule],
  templateUrl: './activity-filters.html',
})
export class ActivityFilters {
  readonly query = input.required<ActivityListQuery>();
  readonly themes = input.required<Theme[]>();
  readonly courses = input.required<Theme[]>();
  /** Visitors only see public activities, so the visibility filter is for signed-in users. */
  readonly showVisibility = input(false);
  readonly queryChange = output<ActivityListQuery>();

  protected readonly title = new FormControl('', { nonNullable: true });
  protected readonly course = new FormControl('', { nonNullable: true });
  protected readonly theme = new FormControl('', { nonNullable: true });

  /** The name typed in the course or theme field when it matches none. */
  protected readonly unknownCourse = signal<string | null>(null);
  protected readonly unknownTheme = signal<string | null>(null);

  protected readonly selectedThemes = computed(() =>
    this.query().themeIds.map(
      (id) => this.themes().find((theme) => theme.id === id) ?? { id, name: `Theme ${id}` },
    ),
  );
  protected readonly availableThemes = computed(() =>
    this.themes().filter((theme) => !this.query().themeIds.includes(theme.id)),
  );
  protected readonly hasFilters = computed(() => hasFilters(this.query()));

  constructor() {
    // Show the filters of the URL, for example after going back in the history.
    effect(() => {
      const { title, courseId } = this.query();
      if ((this.title.value.trim() || null) !== title) {
        this.title.setValue(title ?? '', { emitEvent: false });
      }
      const course = this.courses().find((c) => c.id === courseId);
      if (course) {
        this.course.setValue(course.name);
      } else if (courseId === null && this.unknownCourse() === null) {
        this.course.setValue('');
      }
    });

    this.title.valueChanges
      .pipe(
        debounceTime(TITLE_DEBOUNCE_MS),
        map((value) => value.trim() || null),
        takeUntilDestroyed(),
      )
      .subscribe((title) => {
        if (title !== this.query().title) {
          this.update({ title });
        }
      });
  }

  protected onCourseInput(event: Event): void {
    if (isPickOrClear(event)) {
      this.selectCourse((event.target as HTMLInputElement).value);
    }
  }

  protected onThemeInput(event: Event): void {
    if (isPickOrClear(event)) {
      this.addTheme((event.target as HTMLInputElement).value);
    }
  }

  /** Applies the course typed or picked in the list; a blank field removes the filter. */
  protected selectCourse(value: string): void {
    const name = value.trim();
    const course = name ? findByName(this.courses(), name) : undefined;
    this.unknownCourse.set(name && !course ? name : null);
    const courseId = course?.id ?? null;
    if (courseId !== this.query().courseId) {
      this.update({ courseId });
    }
  }

  /** Adds the theme typed or picked in the list to the selected themes. */
  protected addTheme(value: string): void {
    const name = value.trim();
    if (!name) {
      this.unknownTheme.set(null);
      return;
    }
    const theme = findByName(this.themes(), name);
    this.unknownTheme.set(theme ? null : name);
    if (!theme) {
      return;
    }
    this.theme.setValue('');
    if (!this.query().themeIds.includes(theme.id)) {
      this.update({ themeIds: [...this.query().themeIds, theme.id] });
    }
  }

  protected selectVisibility(value: string): void {
    this.update({ visibility: value === '' ? null : (value as Visibility) });
  }

  protected removeTheme(id: number): void {
    this.update({ themeIds: this.query().themeIds.filter((themeId) => themeId !== id) });
  }

  protected clear(): void {
    this.unknownCourse.set(null);
    this.unknownTheme.set(null);
    this.title.setValue('', { emitEvent: false });
    this.course.setValue('');
    this.theme.setValue('');
    this.queryChange.emit(EMPTY_QUERY);
  }

  private update(changes: Partial<ActivityListQuery>): void {
    this.queryChange.emit({ ...this.query(), ...changes, page: 1 });
  }
}
