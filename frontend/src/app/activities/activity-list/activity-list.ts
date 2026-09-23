import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, Router, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { ThemeApi } from '../../themes/theme-api';
import { ActivityListQuery, ActivityPage } from '../activity';
import { ActivityApi } from '../activity-api';
import { ActivityFilters } from '../activity-filters/activity-filters';
import { EMPTY_QUERY, hasFilters, paramsFromQuery, queryFromParams } from './activity-list-query';

@Component({
  selector: 'app-activity-list',
  imports: [ActivityFilters, DatePipe, RouterLink],
  templateUrl: './activity-list.html',
})
export class ActivityList {
  private readonly activityApi = inject(ActivityApi);
  private readonly themeApi = inject(ThemeApi);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // Without the suggestions, the filters still show the list but cannot be applied.
  protected readonly themes = toSignal(this.themeApi.getThemes().pipe(catchError(() => of([]))), {
    initialValue: [],
  });
  protected readonly courses = toSignal(this.themeApi.getCourses().pipe(catchError(() => of([]))), {
    initialValue: [],
  });

  protected readonly query = signal<ActivityListQuery>(EMPTY_QUERY);
  protected readonly hasFilters = computed(() => hasFilters(this.query()));
  protected readonly result = signal<ActivityPage | null>(null);
  protected readonly status = signal<'loading' | 'loaded' | 'error'>('loading');

  protected readonly totalPages = computed(() => {
    const result = this.result();
    return result ? Math.ceil(result.totalCount / result.pageSize) : 0;
  });

  constructor() {
    // The URL holds the query, so reloading the page or going back keeps it.
    this.route.queryParamMap
      .pipe(
        map(queryFromParams),
        switchMap((query) => {
          this.query.set(query);
          this.status.set('loading');
          return this.activityApi.getPage(query).pipe(catchError(() => of(null)));
        }),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.status.set(result ? 'loaded' : 'error');
      });
  }

  protected applyQuery(query: ActivityListQuery): void {
    this.router.navigate([], { relativeTo: this.route, queryParams: paramsFromQuery(query) });
  }

  /** The URL query parameters of another page with the same filters. */
  protected pageParams(page: number): Params {
    return paramsFromQuery({ ...this.query(), page });
  }
}
