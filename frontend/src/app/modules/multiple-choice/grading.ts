import { MultipleChoiceContent } from './multiple-choice-content';

/** An answer is correct only if it selects exactly the correct choices (all or nothing). */
export function isCorrectAnswer(
  content: MultipleChoiceContent,
  selectedChoiceIds: ReadonlySet<string>,
): boolean {
  return (
    selectedChoiceIds.size === content.correctChoiceIds.length &&
    content.correctChoiceIds.every((id) => selectedChoiceIds.has(id))
  );
}
