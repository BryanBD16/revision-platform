import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ModuleEditor } from '../../module-type';
import { READING_LIMITS } from '../reading-content';
import type { ReadingForm } from '../reading-module-type';

let nextId = 0;

@Component({
  selector: 'app-reading-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './reading-editor.html',
})
export class ReadingEditor implements ModuleEditor<ReadingForm> {
  readonly form = input.required<ReadingForm>();

  protected readonly limits = READING_LIMITS;
  /** Unique prefix for the field ids, since an activity can contain several reading modules. */
  protected readonly id = `reading-${nextId++}`;
}
