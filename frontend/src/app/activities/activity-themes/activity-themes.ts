import { Component, input } from '@angular/core';
import { Theme } from '../activity';

/** The courses (if any) and the themes of an activity, each with a label. */
@Component({
  selector: 'app-activity-themes',
  templateUrl: './activity-themes.html',
  styleUrl: './activity-themes.css',
})
export class ActivityThemes {
  readonly courses = input.required<Theme[]>();
  readonly themes = input.required<Theme[]>();
}
