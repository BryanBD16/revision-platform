import { HttpErrorResponse } from '@angular/common/http';
import {
  Component,
  OnInit,
  computed,
  inject,
  input,
  numberAttribute,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { ModulePlayerHost } from '../../modules/module-player-host/module-player-host';
import { Activity } from '../activity';
import { ActivityApi } from '../activity-api';

/** Takes the learner through the modules of an activity, one at a time. */
@Component({
  selector: 'app-activity-player',
  imports: [ModulePlayerHost, RouterLink],
  templateUrl: './activity-player.html',
})
export class ActivityPlayer implements OnInit {
  private readonly activityApi = inject(ActivityApi);

  /** Bound from the `:id` route parameter. */
  readonly id = input.required<number, unknown>({ transform: numberAttribute });

  protected readonly activity = signal<Activity | null>(null);
  protected readonly status = signal<'loading' | 'loaded' | 'not-found' | 'error'>('loading');
  protected readonly currentIndex = signal(0);

  protected readonly modules = computed(() => this.activity()?.modules ?? []);
  protected readonly currentModule = computed(() => this.modules()[this.currentIndex()]);
  protected readonly finished = computed(
    () => this.modules().length > 0 && this.currentIndex() >= this.modules().length,
  );

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

  protected next(): void {
    this.currentIndex.update((index) => index + 1);
  }

  protected restart(): void {
    this.currentIndex.set(0);
  }
}
