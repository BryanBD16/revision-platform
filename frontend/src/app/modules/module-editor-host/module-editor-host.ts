import { NgComponentOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { FormGroup } from '@angular/forms';
import { findModuleType } from '../module-types';

/** Renders the editor of any module type. */
@Component({
  selector: 'app-module-editor-host',
  imports: [NgComponentOutlet],
  template: `
    @if (editor(); as editor) {
      <ng-container *ngComponentOutlet="editor; inputs: { form: form() }" />
    } @else {
      <p class="error">Unknown module type "{{ type() }}".</p>
    }
  `,
})
export class ModuleEditorHost {
  readonly type = input.required<string>();
  readonly form = input.required<FormGroup>();

  protected readonly editor = computed(() => findModuleType(this.type())?.editor);
}
