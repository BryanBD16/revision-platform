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
import { ModuleResult } from '../../modules/module-type';
import { findModuleType } from '../../modules/module-types';
import { Activity } from '../activity';
import { ActivityApi } from '../activity-api';
import { totalGrade } from './grade';

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
  /** The result of each completed module, in order; `null` for modules that are not graded. */
  protected readonly results = signal<(ModuleResult | null)[]>([]);
  protected readonly currentIndex = computed(() => this.results().length);

  protected readonly modules = computed(() => this.activity()?.modules ?? []);
  protected readonly currentModule = computed(() => this.modules()[this.currentIndex()]);
  protected readonly finished = computed(
    () => this.modules().length > 0 && this.currentIndex() >= this.modules().length,
  );
  protected readonly total = computed(() => totalGrade(this.results()));

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

  protected moduleLabel(type: string): string {
    return findModuleType(type)?.label ?? type;
  }

  protected next(result: ModuleResult | null): void {
    this.results.update((results) => [...results, result]);
  }

  protected restart(): void {
    this.results.set([]);
  }
}
