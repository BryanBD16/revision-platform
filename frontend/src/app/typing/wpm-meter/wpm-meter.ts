import { Component, computed, input } from '@angular/core';
import { SPEED_LEVELS, speedLevel } from '../typing-stats';

/**
 * A typing speed in words per minute, colored by its level: grey, then green, red, and bold
 * black for the fastest speeds. The level is also written, so that the color is not the only
 * clue.
 */
@Component({
  selector: 'app-wpm-meter',
  template: `
    <div class="wpm-meter" [class]="'wpm-meter-' + level()">
      @if (label()) {
        <span class="wpm-meter-label">{{ label() }}</span>
      }
      <span class="wpm-meter-value">{{ wpm() }}</span>
      <span class="wpm-meter-unit">WPM · {{ levelLabel() }}</span>
    </div>
  `,
})
export class WpmMeter {
  readonly wpm = input.required<number>();
  readonly label = input('Speed');

  protected readonly level = computed(() => speedLevel(this.wpm()));
  protected readonly levelLabel = computed(
    () => SPEED_LEVELS.find((level) => level.level === this.level())!.label,
  );
}
