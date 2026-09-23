import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, numberAttribute, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { findModuleType } from '../../modules/module-types';
import { Attempt } from '../attempt';
import { AttemptApi } from '../attempt-api';
import { scoreText } from '../score';

/** One attempt, as it was when the activity was completed. */
@Component({
  selector: 'app-attempt-detail',
  imports: [DatePipe, RouterLink],
  templateUrl: './attempt-detail.html',
})
export class AttemptDetail implements OnInit {
  private readonly attemptApi = inject(AttemptApi);

  /** Bound from the `:id` route parameter. */
  readonly id = input.required<number, unknown>({ transform: numberAttribute });

  protected readonly attempt = signal<Attempt | null>(null);
  protected readonly status = signal<'loading' | 'loaded' | 'not-found' | 'error'>('loading');
  protected readonly scoreText = scoreText;

  ngOnInit(): void {
    this.attemptApi.getById(this.id()).subscribe({
      next: (attempt) => {
        this.attempt.set(attempt);
        this.status.set('loaded');
      },
      error: (error: HttpErrorResponse) =>
        this.status.set(error.status === 404 ? 'not-found' : 'error'),
    });
  }

  protected moduleTypeLabel(type: string): string {
    return findModuleType(type)?.label ?? type;
  }
}
