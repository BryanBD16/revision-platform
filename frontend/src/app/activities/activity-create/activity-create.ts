import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormArray,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService, PERMISSIONS } from '../../auth/auth.service';
import { ModuleEditorHost } from '../../modules/module-editor-host/module-editor-host';
import { MODULE_TYPES, findModuleType } from '../../modules/module-types';
import { notBlank } from '../../shared/validators';
import { ACTIVITY_LIMITS, Visibility } from '../activity';
import { ActivityApi } from '../activity-api';
import { parseThemeNames } from '../theme-names';

type ModuleForm = FormGroup<{
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

@Component({
  selector: 'app-activity-create',
  imports: [ModuleEditorHost, ReactiveFormsModule, RouterLink],
  templateUrl: './activity-create.html',
})
export class ActivityCreate {
  private readonly activityApi = inject(ActivityApi);
  private readonly router = inject(Router);

  protected readonly limits = ACTIVITY_LIMITS;
  protected readonly moduleTypes = MODULE_TYPES;
  /** Only the users allowed to publish choose the visibility; the others create private activities. */
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

  protected readonly submitting = signal(false);
  protected readonly serverErrors = signal<string[]>([]);

  protected get modules(): FormArray<ModuleForm> {
    return this.form.controls.modules;
  }

  protected moduleLabel(type: string): string {
    return findModuleType(type)?.label ?? type;
  }

  protected addModule(type: string): void {
    const moduleType = findModuleType(type);
    if (!moduleType) {
      return;
    }
    this.modules.push(
      new FormGroup({
        type: new FormControl(type, { nonNullable: true }),
        content: moduleType.createForm(),
      }),
    );
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
    this.submitting.set(true);
    this.serverErrors.set([]);

    this.activityApi
      .create({
        title: title.trim(),
        description: description.trim() || null,
        themes: parseThemeNames(themes),
        courses: parseThemeNames(courses),
        visibility: this.canPublish ? visibility : 'private',
        modules: this.modules.controls.map((module) => {
          const type = module.controls.type.value;
          return { type, content: findModuleType(type)!.toContent(module.controls.content) };
        }),
      })
      .subscribe({
        next: (activity) => this.router.navigate(['/activities', activity.id]),
        error: (error: HttpErrorResponse) => {
          this.submitting.set(false);
          this.serverErrors.set(this.errorMessages(error));
        },
      });
  }

  private errorMessages(error: HttpErrorResponse): string[] {
    const fieldErrors: Record<string, string[]> | undefined = error.error?.errors;
    if (error.status !== 400 || !fieldErrors) {
      return ['The activity could not be created. Please try again later.'];
    }

    return Object.entries(fieldErrors).flatMap(([field, messages]) => {
      // Module errors are keyed like "modules[2].content"; show them with the module number.
      const moduleIndex = /^modules\[(\d+)\]/.exec(field)?.[1];
      const prefix = moduleIndex === undefined ? '' : `Module ${Number(moduleIndex) + 1}: `;
      return messages.map((message) => prefix + message);
    });
  }
}
