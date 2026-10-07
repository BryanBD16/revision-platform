import { TYPING_TEXTS, TextPicker, TypingText } from './text-bank';

describe('TYPING_TEXTS', () => {
  it('has three paragraphs on each of the six topics', () => {
    const counts = new Map<string, number>();
    for (const { topic } of TYPING_TEXTS) {
      counts.set(topic, (counts.get(topic) ?? 0) + 1);
    }

    expect([...counts.keys()]).toEqual([
      'SOLID principles',
      'Programming paradigms',
      'Agile and Scrum',
      'Testing practices',
      'Linux, Windows and macOS',
      'Computer hardware',
    ]);
    expect([...counts.values()].every((count) => count === 3)).toBe(true);
  });

  it('has paragraphs of about 100 words', () => {
    for (const { text } of TYPING_TEXTS) {
      expect(text.split(' ').length).toBeGreaterThanOrEqual(90);
      expect(text.split(' ').length).toBeLessThanOrEqual(110);
    }
  });

  it('only uses characters of a standard keyboard, with single spaces', () => {
    for (const { text } of TYPING_TEXTS) {
      expect(text).toMatch(/^[\x21-\x7e]+( [\x21-\x7e]+)*$/);
    }
  });
});

describe('TextPicker', () => {
  const texts: TypingText[] = ['A', 'B', 'C'].map((text) => ({ topic: 'Letters', text }));

  it('gives every paragraph once before repeating one', () => {
    const picker = new TextPicker(texts);

    const firstRound = [picker.next(), picker.next(), picker.next()].map((t) => t.text);

    expect(firstRound.sort()).toEqual(['A', 'B', 'C']);
  });

  it('never gives the same paragraph twice in a row between rounds', () => {
    // With a value close to 1, shuffling keeps the order: every round is A, B, C.
    const picker = new TextPicker(texts, () => 0.999);

    const picked = Array.from({ length: 6 }, () => picker.next().text);

    expect(picked).toEqual(['A', 'B', 'C', 'A', 'B', 'C']);
  });

  it('moves the last paragraph of a round away from the start of the next one', () => {
    // The first round is shuffled as A, B, C and the second as C, B, A, which would repeat C.
    const values = [0.999, 0.999, 0, 0.999];
    const picker = new TextPicker(texts, () => values.shift()!);

    const picked = Array.from({ length: 6 }, () => picker.next().text);

    expect(picked).toEqual(['A', 'B', 'C', 'B', 'A', 'C']);
  });
});
