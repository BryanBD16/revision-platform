import { Component, computed, input } from '@angular/core';
import { parseTextSegments } from './text-segments';

/**
 * Shows a module text, with its line breaks and its code (see parseTextSegments).
 * It only renders inline elements, so it can be used inside a label, a legend or a paragraph.
 */
@Component({
  selector: 'app-formatted-text',
  templateUrl: './formatted-text.html',
  styleUrl: './formatted-text.css',
})
export class FormattedText {
  readonly text = input.required<string>();

  protected readonly segments = computed(() => parseTextSegments(this.text()));
}
