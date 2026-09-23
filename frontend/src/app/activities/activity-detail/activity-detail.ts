import { DatePipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, numberAttribute, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Activity } from '../activity';
import { ActivityApi } from '../activity-api';
import { ActivityThemes } from '../activity-themes/activity-themes';

@Component({
  selector: 'app-activity-detail',
  imports: [ActivityThemes, DatePipe, RouterLink],
  templateUrl: './activity-detail.html',
})
export class ActivityDetail implements OnInit {
  private readonly activityApi = inject(ActivityApi);
  private readonly router = inject(Router);

  /** Bound from the `:id` route parameter. */
  readonly id = input.required<number, unknown>({ transform: numberAttribute });

  protected readonly activity = signal<Activity | null>(null);
  protected readonly status = signal<'loading' | 'loaded' | 'not-found' | 'error'>('loading');
  protected readonly deleting = signal(false);
  protected readonly deleteError = signal<string | null>(null);

  ngOnInit(): void {
    this.activityApi.getById(this.id()).subscribe({
      next: (activity) => {
        this.activity.set(activity);
        this.status.set('loaded');
      },
      error: (error: HttpErrorResponse) =>
        this.status.set(error.status === 404 ? 'not-found' : 'error'),
    });
  }

  /** Deletes the activity for good, after confirmation, and goes back to the list. */
  protected delete(activity: Activity): void {
    if (!confirm(`Delete "${activity.title}" for good? This cannot be undone.`)) {
      return;
    }
    this.deleting.set(true);
    this.deleteError.set(null);
    this.activityApi.delete(activity.id).subscribe({
      next: () => this.router.navigate(['/activities']),
      error: (error: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(
          error.error?.title ?? 'The activity could not be deleted. Please try again later.',
        );
      },
    });
  }
}
