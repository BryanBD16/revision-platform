import { parseTextSegments, toPlainText } from './text-segments';

describe('parseTextSegments', () => {
  it('keeps a text without code as a single text segment', () => {
    expect(parseTextSegments('Line one\nLine two')).toEqual([
      { kind: 'text', text: 'Line one\nLine two' },
    ]);
  });

  it('finds inline code between backticks', () => {
    expect(parseTextSegments('Use `int* const` or `const int*` here')).toEqual([
      { kind: 'text', text: 'Use ' },
      { kind: 'inline-code', text: 'int* const' },
      { kind: 'text', text: ' or ' },
      { kind: 'inline-code', text: 'const int*' },
      { kind: 'text', text: ' here' },
    ]);
  });

  it('keeps a lone backtick or an empty pair as text', () => {
    expect(parseTextSegments('A ` alone and `` empty')).toEqual([
      { kind: 'text', text: 'A ` alone and `` empty' },
    ]);
  });

  it('does not take inline code across lines', () => {
    expect(parseTextSegments('a `b\nc` d')).toEqual([{ kind: 'text', text: 'a `b\nc` d' }]);
  });

  it('finds a code block between fences, keeping its indentation', () => {
    const text = 'Look:\n```\nint main() {\n    return 0;\n}\n```\n\nWhat does it return?';

    expect(parseTextSegments(text)).toEqual([
      { kind: 'text', text: 'Look:' },
      { kind: 'code-block', text: 'int main() {\n    return 0;\n}' },
      { kind: 'text', text: 'What does it return?' },
    ]);
  });

  it('accepts a language after the opening fence', () => {
    expect(parseTextSegments('```cpp\nint x;\n```')).toEqual([
      { kind: 'code-block', text: 'int x;' },
    ]);
  });

  it('does not look for inline code inside a code block', () => {
    expect(parseTextSegments('```\nauto s = `raw`;\n```')).toEqual([
      { kind: 'code-block', text: 'auto s = `raw`;' },
    ]);
  });

  it('finds several code blocks', () => {
    expect(parseTextSegments('```\na\n```\nthen\n```\nb\n```')).toEqual([
      { kind: 'code-block', text: 'a' },
      { kind: 'text', text: 'then' },
      { kind: 'code-block', text: 'b' },
    ]);
  });

  it('keeps an opening fence without a closing one as text', () => {
    expect(parseTextSegments('```\nint x;')).toEqual([{ kind: 'text', text: '```\nint x;' }]);
  });

  it('keeps fences that are not alone on their line as text', () => {
    expect(parseTextSegments('a ```b``` c')).toEqual([{ kind: 'text', text: 'a ```b``` c' }]);
  });
});

describe('toPlainText', () => {
  it('removes the code markers', () => {
    expect(toPlainText('Use `delete[]` with\n```\nnew int[3]\n```')).toBe(
      'Use delete[] with new int[3]',
    );
  });
});
