import { Component, input } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ModuleEditor } from '../../module-type';
import { MULTIPLE_CHOICE_LIMITS } from '../multiple-choice-content';
import { type MultipleChoiceForm, createChoiceForm } from '../multiple-choice-module-type';

let nextId = 0;

@Component({
  selector: 'app-multiple-choice-editor',
  imports: [ReactiveFormsModule],
  templateUrl: './multiple-choice-editor.html',
})
export class MultipleChoiceEditor implements ModuleEditor<MultipleChoiceForm> {
  readonly form = input.required<MultipleChoiceForm>();

  protected readonly limits = MULTIPLE_CHOICE_LIMITS;
  /** Unique prefix for the field ids, since an activity can contain several questions. */
  protected readonly id = `multiple-choice-${nextId++}`;

  protected get choices() {
    return this.form().controls.choices;
  }

  protected addChoice(): void {
    this.choices.push(createChoiceForm());
  }

  protected removeChoice(index: number): void {
    this.choices.removeAt(index);
  }
}
