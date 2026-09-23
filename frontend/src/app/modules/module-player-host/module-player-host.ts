import {
  Component,
  ViewContainerRef,
  computed,
  effect,
  input,
  inputBinding,
  output,
  outputBinding,
  untracked,
  viewChild,
} from '@angular/core';
import { RevisionModule } from '../../activities/activity';
import { findModuleType } from '../module-types';

/** Renders the player of any module type and forwards its completion. */
@Component({
  selector: 'app-module-player-host',
  template: `
    @if (!player()) {
      <p class="error">Unknown module type "{{ module().type }}".</p>
      <button type="button" class="button" (click)="completed.emit()">Skip</button>
    }
    <ng-container #container />
  `,
})
export class ModulePlayerHost {
  readonly module = input.required<RevisionModule>();
  readonly completed = output<void>();

  protected readonly player = computed(() => findModuleType(this.module().type)?.player);
  private readonly container = viewChild.required('container', { read: ViewContainerRef });

  constructor() {
    // Recreate the player whenever the module changes.
    effect(() => {
      const container = this.container();
      const player = this.player();
      const content = this.module().content;

      untracked(() => {
        container.clear();
        if (player) {
          container.createComponent(player, {
            bindings: [
              inputBinding('content', () => content),
              outputBinding('completed', () => this.completed.emit()),
            ],
          });
        }
      });
    });
  }
}
