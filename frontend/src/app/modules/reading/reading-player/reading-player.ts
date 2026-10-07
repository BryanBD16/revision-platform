import { Component, input, output } from '@angular/core';
import { FormattedText } from '../../../shared/formatted-text/formatted-text';
import { ModulePlayer, ModuleResult } from '../../module-type';
import { ReadingContent } from '../reading-content';

@Component({
  selector: 'app-reading-player',
  templateUrl: './reading-player.html',
  imports: [FormattedText],
})
export class ReadingPlayer implements ModulePlayer<ReadingContent> {
  readonly content = input.required<ReadingContent>();
  readonly completed = output<ModuleResult | null>();
}
