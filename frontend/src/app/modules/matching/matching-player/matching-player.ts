import { Component, computed, input, output, signal } from '@angular/core';
import { ModulePlayer, ModuleResult } from '../../module-type';
import { scoreMatching } from '../grading';
import { MatchingContent } from '../matching-content';
import { shuffle } from '../shuffle';

let nextId = 0;

@Component({
  selector: 'app-matching-player',
  templateUrl: './matching-player.html',
  styleUrl: './matching-player.css',
})
export class MatchingPlayer implements ModulePlayer<MatchingContent> {
  readonly content = input.required<MatchingContent>();
  readonly completed = output<ModuleResult | null>();

  /** Unique prefix for the field ids of this module. */
  protected readonly id = `matching-answer-${nextId++}`;

  /** The definitions offered in each dropdown, in a random order. */
  protected readonly options = computed(() =>
    shuffle(this.content().pairs).map(({ id, definition }) => ({ id, definition })),
  );

  /** For each concept's pair id, the pair id of the chosen definition. */
  protected readonly answers = signal<ReadonlyMap<string, string>>(new Map());
  protected readonly answered = signal(false);

  protected readonly allAnswered = computed(() =>
    this.content().pairs.every((pair) => this.answers().has(pair.id)),
  );
  protected readonly score = computed(() => scoreMatching(this.content(), this.answers()));

  protected isCorrect(pairId: string): boolean {
    return this.answers().get(pairId) === pairId;
  }

  protected choose(pairId: string, event: Event): void {
    const definitionId = (event.target as HTMLSelectElement).value;
    this.answers.update((answers) => {
      const next = new Map(answers);
      if (definitionId) {
        next.set(pairId, definitionId);
      } else {
        next.delete(pairId);
      }
      return next;
    });
  }

  protected checkAnswers(): void {
    this.answered.set(true);
  }

  protected continue(): void {
    this.completed.emit({ score: this.score(), maxScore: this.content().pairs.length });
  }
}
