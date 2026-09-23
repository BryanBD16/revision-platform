import { isCorrectAnswer } from './grading';
import { MultipleChoiceContent } from './multiple-choice-content';

describe('isCorrectAnswer', () => {
  function content(correctChoiceIds: string[]): MultipleChoiceContent {
    return {
      question: 'Question?',
      choices: [
        { id: 'a', text: 'A' },
        { id: 'b', text: 'B' },
        { id: 'c', text: 'C' },
      ],
      correctChoiceIds,
      explanation: null,
    };
  }

  it('accepts the correct choice', () => {
    expect(isCorrectAnswer(content(['b']), new Set(['b']))).toBe(true);
  });

  it('rejects another choice', () => {
    expect(isCorrectAnswer(content(['b']), new Set(['a']))).toBe(false);
  });

  it('rejects an empty answer', () => {
    expect(isCorrectAnswer(content(['b']), new Set())).toBe(false);
  });

  it('requires all the correct choices when there are several', () => {
    expect(isCorrectAnswer(content(['a', 'c']), new Set(['a', 'c']))).toBe(true);
    expect(isCorrectAnswer(content(['a', 'c']), new Set(['a']))).toBe(false);
  });

  it('rejects an answer that also selects a wrong choice', () => {
    expect(isCorrectAnswer(content(['a', 'c']), new Set(['a', 'b', 'c']))).toBe(false);
  });
});
