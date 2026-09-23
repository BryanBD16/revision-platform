import { DatePipe } from '@angular/common';
import { Component, inject, input, numberAttribute, signal } from '@angular/core';
import { toObservable, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, combineLatest, of, switchMap } from 'rxjs';
import { AttemptPage } from '../attempt';
import { AttemptApi } from '../attempt-api';
import { scoreText } from '../score';

/** The attempts of the signed-in user, newest first, optionally only those of one activity. */
@Component({
  selector: 'app-my-results',
  imports: [DatePipe, RouterLink],
  templateUrl: './my-results.html',
})
export class MyResults {
  private readonly attemptApi = inject(AttemptApi);

  /** Bound from the `activityId` query parameter. */
  readonly activityId = input<number | undefined, unknown>(undefined, {
    transform: (value: unknown) => (value ? numberAttribute(value) : undefined),
  });

  protected readonly page = signal(1);
  protected readonly result = signal<AttemptPage | null>(null);
  protected readonly status = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly scoreText = scoreText;

  constructor() {
    combineLatest([toObservable(this.activityId), toObservable(this.page)])
      .pipe(
        switchMap(([activityId, page]) =>
          this.attemptApi.getPage({ page, activityId }).pipe(catchError(() => of(null))),
        ),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.status.set(result ? 'loaded' : 'error');
      });
  }

  protected hasNextPage(page: AttemptPage): boolean {
    return page.page * page.pageSize < page.totalCount;
  }
}
