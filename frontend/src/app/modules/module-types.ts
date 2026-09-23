import { ModuleTypeDefinition } from './module-type';
import { multipleChoiceModuleType } from './multiple-choice/multiple-choice-module-type';
import { readingModuleType } from './reading/reading-module-type';

/** All module types, in the order they are offered to users. Add new module types here. */
// Each type has its own content and form types, so the list uses `any` for them.
export const MODULE_TYPES: readonly ModuleTypeDefinition<any, any>[] = [
  readingModuleType,
  multipleChoiceModuleType,
];

export function findModuleType(type: string): ModuleTypeDefinition | undefined {
  return MODULE_TYPES.find((moduleType) => moduleType.type === type);
}
