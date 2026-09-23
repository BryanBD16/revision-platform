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
import { SaveAttemptRequest } from '../../attempts/attempt';
import { AttemptApi } from '../../attempts/attempt-api';
import { AuthService } from '../../auth/auth.service';
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
  private readonly attemptApi = inject(AttemptApi);

  protected readonly signedIn = inject(AuthService).signedIn;

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
  /** Saving the result of a completed activity; visitors' results are not saved. */
  protected readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');
  protected readonly saveError = signal<string | null>(null);

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
    if (this.finished() && this.signedIn()) {
      this.saveResult();
    }
  }

  /** Saves the completed activity; also used to retry after a failure. */
  protected saveResult(): void {
    const activity = this.activity()!;
    const request: SaveAttemptRequest = {
      activityId: activity.id,
      modules: activity.modules.map((module, index) => ({
        moduleId: module.id,
        label: findModuleType(module.type)?.summarize(module.content) ?? null,
        score: this.results()[index]?.score ?? null,
        maxScore: this.results()[index]?.maxScore ?? null,
      })),
    };

    this.saveStatus.set('saving');
    this.saveError.set(null);
    this.attemptApi.save(request).subscribe({
      next: () => this.saveStatus.set('saved'),
      error: (error: HttpErrorResponse) => {
        this.saveStatus.set('error');
        // A 400 on "modules" means the activity changed while it was being completed.
        this.saveError.set(
          error.error?.errors?.modules?.[0] ??
            'Your result could not be saved. Please try again later.',
        );
      },
    });
  }

  protected restart(): void {
    this.results.set([]);
    this.saveStatus.set('idle');
  }
}
