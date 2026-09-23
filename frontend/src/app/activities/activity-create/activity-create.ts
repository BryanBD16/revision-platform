import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { SaveActivityRequest } from '../activity';
import { ActivityApi } from '../activity-api';
import { ActivityForm } from '../activity-form/activity-form';
import { saveErrorMessages } from '../activity-form/save-error-messages';

@Component({
  selector: 'app-activity-create',
  imports: [ActivityForm, RouterLink],
  templateUrl: './activity-create.html',
})
export class ActivityCreate {
  private readonly activityApi = inject(ActivityApi);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  protected create(request: SaveActivityRequest): void {
    this.submitting.set(true);
    this.serverErrors.set([]);
    this.activityApi.create(request).subscribe({
      next: (activity) => this.router.navigate(['/activities', activity.id]),
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        this.serverErrors.set(
          saveErrorMessages(error, 'The activity could not be created. Please try again later.'),
        );
      },
    });
  }
}
