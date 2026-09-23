import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject, input, numberAttribute, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Activity, SaveActivityRequest } from '../activity';
import { ActivityApi } from '../activity-api';
import { ActivityForm } from '../activity-form/activity-form';
import { saveErrorMessages } from '../activity-form/save-error-messages';

@Component({
  selector: 'app-activity-edit',
  imports: [ActivityForm, RouterLink],
  templateUrl: './activity-edit.html',
})
export class ActivityEdit implements OnInit {
  private readonly activityApi = inject(ActivityApi);
  private readonly router = inject(Router);

  /** Bound from the `:id` route parameter. */
  readonly id = input.required<number, unknown>({ transform: numberAttribute });

  protected readonly activity = signal<Activity | null>(null);
  protected readonly status = signal<'loading' | 'loaded' | 'not-found' | 'forbidden' | 'error'>(
    'loading',
  );
  protected readonly submitting = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  ngOnInit(): void {
    this.activityApi.getById(this.id()).subscribe({
      next: (activity) => {
        this.activity.set(activity);
        // The API refuses the changes anyway; this only avoids showing a useless form.
        this.status.set(activity.canEdit ? 'loaded' : 'forbidden');
      },
      error: (error: HttpErrorResponse) =>
        this.status.set(error.status === 404 ? 'not-found' : 'error'),
    });
  }

  protected save(request: SaveActivityRequest): void {
    this.submitting.set(true);
    this.serverErrors.set([]);
    this.activityApi.update(this.id(), request).subscribe({
      next: (activity) => this.router.navigate(['/activities', activity.id]),
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverErrors.set(
          saveErrorMessages(error, 'The activity could not be saved. Please try again later.'),
        );
      },
    });
  }
}
