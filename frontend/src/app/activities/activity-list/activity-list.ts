import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Params, RouterLink } from '@angular/router';
import { catchError, map, of, switchMap } from 'rxjs';
import { ActivityListQuery, ActivityPage } from '../activity';
import { ActivityApi } from '../activity-api';
import { paramsFromQuery, queryFromParams } from './activity-list-query';

@Component({
  selector: 'app-activity-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './activity-list.html',
})
export class ActivityList {
  private readonly activityApi = inject(ActivityApi);
  private readonly route = inject(ActivatedRoute);

  protected readonly query = signal<ActivityListQuery>({ page: 1 });
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

  /** The URL query parameters of another page with the same filters. */
  protected pageParams(page: number): Params {
    return paramsFromQuery({ ...this.query(), page });
  }
}
