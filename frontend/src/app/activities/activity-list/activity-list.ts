import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ActivitySummary } from '../activity';
import { ActivityApi } from '../activity-api';

@Component({
  selector: 'app-activity-list',
  imports: [DatePipe, RouterLink],
  templateUrl: './activity-list.html',
})
export class ActivityList implements OnInit {
  private readonly activityApi = inject(ActivityApi);

  protected readonly activities = signal<ActivitySummary[]>([]);
  protected readonly status = signal<'loading' | 'loaded' | 'error'>('loading');

  ngOnInit(): void {
    this.activityApi.getAll().subscribe({
      next: (activities) => {
        this.activities.set(activities);
        this.status.set('loaded');
      },
      error: () => this.status.set('error'),
    });
  }
}
