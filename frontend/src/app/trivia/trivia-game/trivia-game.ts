import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RevisionModule } from '../../activities/activity';
import { AuthService } from '../../auth/auth.service';
import { ModulePlayerHost } from '../../modules/module-player-host/module-player-host';
import { ModuleResult } from '../../modules/module-type';
import { shuffle } from '../../shared/shuffle';
import { TRIVIA_THEME_LIMITS, TriviaQuestion, TriviaTheme } from '../trivia';
import { TriviaApi } from '../trivia-api';

/**
 * The trivia game: the player chooses 1 to 3 themes, then answers random multiple-choice
 * questions of the public activities until the first wrong answer. The score is the number
 * of correct answers in a row; it is saved for signed-in users.
 */
@Component({
  selector: 'app-trivia-game',
  imports: [ModulePlayerHost, RouterLink],
  templateUrl: './trivia-game.html',
})
export class TriviaGame implements OnInit {
  private readonly triviaApi = inject(TriviaApi);

  protected readonly signedIn = inject(AuthService).signedIn;
  protected readonly limits = TRIVIA_THEME_LIMITS;

  protected readonly themes = signal<TriviaTheme[]>([]);
  protected readonly themesStatus = signal<'loading' | 'loaded' | 'error'>('loading');
  protected readonly selectedIds = signal<number[]>([]);
  protected readonly canStart = computed(
    () =>
      this.selectedIds().length >= this.limits.min && this.selectedIds().length <= this.limits.max,
  );

  protected readonly phase = signal<'choosing' | 'loading' | 'playing' | 'over'>('choosing');
  protected readonly loadError = signal(false);
  /** The questions of the game, in a random order. */
  private readonly questions = signal<TriviaQuestion[]>([]);
  /** The number of correct answers so far, which is also the index of the current question. */
  protected readonly score = signal(0);
  protected readonly perfect = computed(
    () => this.phase() === 'over' && this.score() === this.questions().length,
  );
  protected readonly questionCount = computed(() => this.questions().length);

  /** The current question, in the form the module player expects. */
  protected readonly currentModule = computed<RevisionModule | null>(() => {
    const question = this.questions()[this.score()];
    return question
      ? {
          id: question.moduleId,
          position: this.score(),
          type: 'multiple-choice',
          content: question.content,
        }
      : null;
  });
  protected readonly currentActivityTitle = computed(
    () => this.questions()[this.score()]?.activityTitle ?? '',
  );

  protected readonly selectedThemeNames = computed(() =>
    this.selectedIds().map((id) => this.themes().find((theme) => theme.id === id)?.name ?? ''),
  );

  /** Saving the score of a finished game; visitors' scores are not saved. */
  protected readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  ngOnInit(): void {
    this.triviaApi.getThemes().subscribe({
      next: (themes) => {
        this.themes.set(themes);
        this.themesStatus.set('loaded');
      },
      error: () => this.themesStatus.set('error'),
    });
  }

  protected isSelected(id: number): boolean {
    return this.selectedIds().includes(id);
  }

  /** A theme cannot be added once the maximum is reached, but can always be removed. */
  protected isDisabled(id: number): boolean {
    return !this.isSelected(id) && this.selectedIds().length >= this.limits.max;
  }

  protected toggleTheme(id: number): void {
    this.selectedIds.update((ids) =>
      ids.includes(id) ? ids.filter((selected) => selected !== id) : [...ids, id],
    );
  }

  protected start(): void {
    this.phase.set('loading');
    this.loadError.set(false);
    this.triviaApi.getQuestions(this.selectedIds()).subscribe({
      next: (questions) => this.play(questions),
      error: () => {
        this.loadError.set(true);
        this.phase.set('choosing');
      },
    });
  }

  /** Plays again on the same themes, with the questions in a new order. */
  protected playAgain(): void {
    this.play(this.questions());
  }

  protected chooseOtherThemes(): void {
    this.phase.set('choosing');
  }

  protected answered(result: ModuleResult | null): void {
    const correct = result !== null && result.score === result.maxScore;
    if (correct) {
      this.score.update((score) => score + 1);
    }
    if (!correct || this.score() === this.questions().length) {
      this.phase.set('over');
      if (this.signedIn()) {
        this.saveScore();
      }
    }
  }

  /** Saves the score of the finished game; also used to retry after a failure. */
  protected saveScore(): void {
    this.saveStatus.set('saving');
    this.triviaApi.saveScore({ score: this.score(), themeIds: this.selectedIds() }).subscribe({
      next: () => this.saveStatus.set('saved'),
      error: () => this.saveStatus.set('error'),
    });
  }

  private play(questions: TriviaQuestion[]): void {
    this.questions.set(shuffle(questions));
    this.score.set(0);
    this.saveStatus.set('idle');
    this.phase.set(questions.length > 0 ? 'playing' : 'over');
  }
}
