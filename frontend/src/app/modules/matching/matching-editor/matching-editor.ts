import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ModuleEditor } from '../../module-type';
import { MATCHING_LIMITS } from '../matching-content';
import { type MatchingForm, createPairForm } from '../matching-module-type';

let nextId = 0;

@Component({
  selector: 'app-matching-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './matching-editor.html',
  styleUrl: './matching-editor.css',
})
export class MatchingEditor implements ModuleEditor<MatchingForm> {
  readonly form = input.required<MatchingForm>();

  protected readonly limits = MATCHING_LIMITS;
  /** Unique prefix for the field ids, since an activity can contain several matching modules. */
  protected readonly id = `matching-${nextId++}`;

  protected get pairs() {
    return this.form().controls.pairs;
  }

  protected addPair(): void {
    this.pairs.push(createPairForm());
  }

  protected removePair(index: number): void {
    this.pairs.removeAt(index);
  }
}
