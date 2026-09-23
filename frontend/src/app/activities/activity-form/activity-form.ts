import { Component, OnInit, inject, input, output } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { AuthService, PERMISSIONS } from '../../auth/auth.service';
import { ModuleEditorHost } from '../../modules/module-editor-host/module-editor-host';
import { MODULE_TYPES, findModuleType } from '../../modules/module-types';
import { notBlank } from '../../shared/validators';
import { ACTIVITY_LIMITS, Activity, SaveActivityRequest, Visibility } from '../activity';
import { parseThemeNames } from '../theme-names';

type ModuleForm = FormGroup<{
  /** The id of an existing module, or null for a new one. */
  id: FormControl<number | null>;
  type: FormControl<string>;
  content: FormGroup;
}>;

function validThemeNames(control: AbstractControl<string>): ValidationErrors | null {
  const names = parseThemeNames(control.value);
  if (names.length === 0) {
    return { required: true };
  }
  if (names.some((name) => name.length > ACTIVITY_LIMITS.themeNameMaxLength)) {
    return { themeTooLong: true };
  }
  return null;
}

function validCourseNames(control: AbstractControl<string>): ValidationErrors | null {
  const names = parseThemeNames(control.value);
  return names.some((name) => name.length > ACTIVITY_LIMITS.themeNameMaxLength)
    ? { courseTooLong: true }
    : null;
}

function atLeastOne(control: AbstractControl<unknown[]>): ValidationErrors | null {
  return control.value.length > 0 ? null : { required: true };
}

/**
 * The form of an activity and its modules, empty to create an activity or filled
 * with `activity` to edit it. It emits the request to save; the page sends it.
 */
@Component({
  selector: 'app-activity-form',
  imports: [ModuleEditorHost, ReactiveFormsModule],
  templateUrl: './activity-form.html',
})
export class ActivityForm implements OnInit {
  /** The activity to edit, or null to create a new one. */
  readonly activity = input<Activity | null>(null);
  readonly submitLabel = input.required<string>();
  readonly submittingLabel = input.required<string>();
  readonly submitting = input(false);
  readonly serverErrors = input<string[]>([]);
  readonly saved = output<SaveActivityRequest>();

  protected readonly limits = ACTIVITY_LIMITS;
  protected readonly moduleTypes = MODULE_TYPES;
  /** Only the users allowed to publish choose the visibility; the others' activities stay private. */
  protected readonly canPublish = inject(AuthService).can(PERMISSIONS.publishActivities);

  protected readonly form = new FormGroup({
    title: new FormControl('', {
      nonNullable: true,
      validators: [notBlank, Validators.maxLength(ACTIVITY_LIMITS.titleMaxLength)],
    }),
    description: new FormControl('', {
      nonNullable: true,
      validators: [Validators.maxLength(ACTIVITY_LIMITS.descriptionMaxLength)],
    }),
    themes: new FormControl('', { nonNullable: true, validators: [validThemeNames] }),
    courses: new FormControl('', { nonNullable: true, validators: [validCourseNames] }),
    visibility: new FormControl<Visibility>('private', { nonNullable: true }),
    modules: new FormArray<ModuleForm>([], { validators: [atLeastOne] }),
  });

  protected get modules(): FormArray<ModuleForm> {
    return this.form.controls.modules;
  }

  ngOnInit(): void {
    const activity = this.activity();
    if (!activity) {
      return;
    }
    this.form.patchValue({
      title: activity.title,
      description: activity.description ?? '',
      themes: activity.themes.map((theme) => theme.name).join(', '),
      courses: activity.courses.map((course) => course.name).join(', '),
      visibility: activity.visibility,
    });
    for (const module of activity.modules) {
      this.pushModule(module.type, module.id, module.content);
    }
  }

  protected moduleLabel(type: string): string {
    return findModuleType(type)?.label ?? type;
  }

  protected addModule(type: string): void {
    this.pushModule(type, null);
  }

  protected removeModule(index: number): void {
    this.modules.removeAt(index);
  }

  /** Moves a module up (-1) or down (+1). */
  protected moveModule(index: number, offset: -1 | 1): void {
    const module = this.modules.at(index);
    this.modules.removeAt(index);
    this.modules.insert(index + offset, module);
  }

  protected submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { title, description, themes, courses, visibility } = this.form.getRawValue();
    this.saved.emit({
      title: title.trim(),
      description: description.trim() || null,
      themes: parseThemeNames(themes),
      courses: parseThemeNames(courses),
      // Without the permission, a new activity is private and an existing one keeps its visibility.
      visibility: this.canPublish ? visibility : (this.activity()?.visibility ?? 'private'),
      modules: this.modules.controls.map((module) => {
        const { id, type } = module.getRawValue();
        const content = findModuleType(type)!.toContent(module.controls.content);
        return id === null ? { type, content } : { id, type, content };
      }),
    });
  }

  private pushModule(type: string, id: number | null, content?: unknown): void {
    const moduleType = findModuleType(type);
    if (!moduleType) {
      return;
    }
    this.modules.push(
      new FormGroup({
        id: new FormControl<number | null>(id),
        type: new FormControl(type, { nonNullable: true }),
        content: moduleType.createForm(content),
      }),
    );
  }
}
