import { FormControl, FormGroup, Validators } from '@angular/forms';
import { notBlank } from '../../shared/validators';
import { ModuleTypeDefinition } from '../module-type';
import { READING_LIMITS, ReadingContent } from './reading-content';
import { ReadingEditor } from './reading-editor/reading-editor';
import { ReadingPlayer } from './reading-player/reading-player';

export type ReadingForm = FormGroup<{
  title: FormControl<string>;
  body: FormControl<string>;
}>;

export const readingModuleType: ModuleTypeDefinition<ReadingContent, ReadingForm> = {
  type: 'reading',
  label: 'Reading',
  createForm: () =>
    new FormGroup({
      title: new FormControl('', {
        nonNullable: true,
        validators: [Validators.maxLength(READING_LIMITS.titleMaxLength)],
      }),
      body: new FormControl('', {
        nonNullable: true,
        validators: [notBlank, Validators.maxLength(READING_LIMITS.bodyMaxLength)],
      }),
    }),
  toContent: (form) => {
    const { title, body } = form.getRawValue();
    return { title: title.trim() || null, body: body.trim() };
  },
  editor: ReadingEditor,
  player: ReadingPlayer,
};
