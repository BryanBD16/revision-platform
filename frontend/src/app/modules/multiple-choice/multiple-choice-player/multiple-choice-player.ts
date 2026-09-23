import { Component, computed, input, output, signal } from '@angular/core';
import { ModulePlayer, ModuleResult } from '../../module-type';
import { isCorrectAnswer } from '../grading';
import { MultipleChoiceContent } from '../multiple-choice-content';

let nextId = 0;

@Component({
  selector: 'app-multiple-choice-player',
  templateUrl: './multiple-choice-player.html',
})
export class MultipleChoicePlayer implements ModulePlayer<MultipleChoiceContent> {
  readonly content = input.required<MultipleChoiceContent>();
  readonly completed = output<ModuleResult | null>();

  /** Name shared by the radio buttons of this question. */
  protected readonly name = `multiple-choice-answer-${nextId++}`;

  protected readonly selected = signal<ReadonlySet<string>>(new Set());
  protected readonly answered = signal(false);

  /** With several correct answers, learners pick with checkboxes instead of radio buttons. */
  protected readonly severalAnswers = computed(() => this.content().correctChoiceIds.length > 1);
  protected readonly correct = computed(() => isCorrectAnswer(this.content(), this.selected()));

  protected isCorrectChoice(id: string): boolean {
    return this.content().correctChoiceIds.includes(id);
  }

  protected toggle(id: string): void {
    if (!this.severalAnswers()) {
      this.selected.set(new Set([id]));
      return;
    }
    this.selected.update((selected) => {
      const next = new Set(selected);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  protected checkAnswer(): void {
    this.answered.set(true);
  }

  protected continue(): void {
    this.completed.emit({ score: this.correct() ? 1 : 0, maxScore: 1 });
  }
}
