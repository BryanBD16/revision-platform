import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { TypingResultPage, testLabel } from '../typing';
import { TypingApi } from '../typing-api';

/** The typing test results of the signed-in user, newest first. */
@Component({
  selector: 'app-typing-results',
  imports: [DatePipe, RouterLink],
  templateUrl: './typing-results.html',
})
export class TypingResults {
  private readonly typingApi = inject(TypingApi);

  protected readonly testLabel = testLabel;
  protected readonly page = signal(1);
  protected readonly result = signal<TypingResultPage | null>(null);
  protected readonly status = signal<'loading' | 'loaded' | 'error'>('loading');

  constructor() {
    toObservable(this.page)
      .pipe(
        switchMap((page) => this.typingApi.getResults(page).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.status.set(result ? 'loaded' : 'error');
      });
  }

  protected hasNextPage(page: TypingResultPage): boolean {
    return page.page * page.pageSize < page.totalCount;
  }
}
