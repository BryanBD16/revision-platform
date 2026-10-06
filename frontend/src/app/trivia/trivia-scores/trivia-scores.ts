import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { catchError, of, switchMap } from 'rxjs';
import { TriviaScore, TriviaScorePage } from '../trivia';
import { TriviaApi } from '../trivia-api';

/** The trivia scores of the signed-in user, newest first, with their best score. */
@Component({
  selector: 'app-trivia-scores',
  imports: [DatePipe, RouterLink],
  templateUrl: './trivia-scores.html',
})
export class TriviaScores {
  private readonly triviaApi = inject(TriviaApi);

  protected readonly page = signal(1);
  protected readonly result = signal<TriviaScorePage | null>(null);
  protected readonly status = signal<'loading' | 'loaded' | 'error'>('loading');

  constructor() {
    toObservable(this.page)
      .pipe(
        switchMap((page) => this.triviaApi.getScores(page).pipe(catchError(() => of(null)))),
        takeUntilDestroyed(),
      )
      .subscribe((result) => {
        this.result.set(result);
        this.status.set(result ? 'loaded' : 'error');
      });
  }

  protected themeNames(score: TriviaScore): string {
    return score.themes.map((theme) => theme.name).join(', ');
  }

  protected hasNextPage(page: TriviaScorePage): boolean {
    return page.page * page.pageSize < page.totalCount;
  }
}
