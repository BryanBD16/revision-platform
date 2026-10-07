import {
  Component,
  ElementRef,
  afterNextRender,
  afterRenderEffect,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

/** What the player typed so far. */
export interface TypingProgress {
  typed: string;
  /** The typed characters that match the text at their position. */
  correctChars: number;
  /** Every character typed, corrected ones included. */
  keystrokes: number;
  /** The keystrokes that were right when typed. */
  correctKeystrokes: number;
}

/**
 * The text to type, shown character by character: right characters in the text color, wrong
 * ones in red, and a caret before the next one. The player types directly on it; Backspace
 * corrects a character and Ctrl+Backspace a whole word. Shared by every game mode: it knows
 * nothing of time or scores.
 */
@Component({
  selector: 'app-typing-area',
  templateUrl: './typing-area.html',
})
export class TypingArea {
  readonly text = input.required<string>();
  readonly disabled = input(false);
  /** Focuses the area once it is shown, so that the player can type right away. */
  readonly autofocus = input(false);
  readonly progress = output<TypingProgress>();

  protected readonly typed = signal('');
  protected readonly focused = signal(false);
  protected readonly chars = computed(() => [...this.text()]);
  private keystrokes = 0;
  private correctKeystrokes = 0;

  private readonly box = viewChild.required<ElementRef<HTMLElement>>('box');

  constructor() {
    afterNextRender(() => {
      if (this.autofocus()) {
        this.focus();
      }
    });
    // Keeps the next character on the first or second visible line.
    afterRenderEffect(() => {
      this.typed();
      const box = this.box().nativeElement;
      const current = box.querySelector<HTMLElement>('.typing-char-current');
      if (current) {
        box.scrollTop = Math.max(0, current.offsetTop - current.offsetHeight);
      }
    });
  }

  focus(): void {
    this.box().nativeElement.focus();
  }

  protected charState(index: number): 'correct' | 'incorrect' | 'current' | 'pending' {
    const typed = this.typed();
    if (index < typed.length) {
      return typed[index] === this.text()[index] ? 'correct' : 'incorrect';
    }
    return index === typed.length ? 'current' : 'pending';
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (this.disabled() || event.altKey || event.metaKey) {
      return;
    }
    const typed = this.typed();
    if (event.key === 'Backspace') {
      event.preventDefault();
      this.typed.set(event.ctrlKey ? withoutLastWord(typed) : typed.slice(0, -1));
    } else if (event.key.length === 1 && !event.ctrlKey) {
      event.preventDefault();
      if (typed.length >= this.text().length) {
        return;
      }
      this.keystrokes++;
      if (event.key === this.text()[typed.length]) {
        this.correctKeystrokes++;
      }
      this.typed.set(typed + event.key);
    } else {
      return;
    }
    this.emitProgress();
  }

  private emitProgress(): void {
    const typed = this.typed();
    const text = this.text();
    let correctChars = 0;
    for (let i = 0; i < typed.length; i++) {
      if (typed[i] === text[i]) {
        correctChars++;
      }
    }
    this.progress.emit({
      typed,
      correctChars,
      keystrokes: this.keystrokes,
      correctKeystrokes: this.correctKeystrokes,
    });
  }
}

/** Removes the last word and the spaces after it, like Ctrl+Backspace in a text field. */
function withoutLastWord(typed: string): string {
  return typed.replace(/\S*\s*$/, '');
}
