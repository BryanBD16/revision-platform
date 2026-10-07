/** A piece of a module text: plain text, inline code or a code block. */
export type TextSegment =
  | { kind: 'text'; text: string }
  | { kind: 'inline-code'; text: string }
  | { kind: 'code-block'; text: string };

/** An opening fence: ``` alone on its line, optionally followed by a language such as cpp. */
const OPENING_FENCE = /^```[\w+#-]*\s*$/;
const CLOSING_FENCE = /^```\s*$/;
/** Inline code: text between two single backticks, on a single line. */
const INLINE_CODE = /(?<!`)`([^`\n]+)`(?!`)/g;

/**
 * Splits a module text into segments. Code blocks are lines between ``` fences
 * (a fence without a closing one is kept as text); inline code is text between
 * backticks. The line breaks around a code block are dropped, since a block is
 * displayed on its own lines anyway.
 */
export function parseTextSegments(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  const lines = text.split('\n');
  let textLines: string[] = [];

  const flushText = () => {
    const pending = textLines.join('\n').replace(/^\n+|\n+$/g, '');
    textLines = [];
    if (pending) {
      segments.push(...parseInlineCode(pending));
    }
  };

  for (let i = 0; i < lines.length; i++) {
    const closing = OPENING_FENCE.test(lines[i]) ? findClosingFence(lines, i + 1) : -1;
    if (closing === -1) {
      textLines.push(lines[i]);
      continue;
    }
    flushText();
    segments.push({ kind: 'code-block', text: lines.slice(i + 1, closing).join('\n') });
    i = closing;
  }
  flushText();
  return segments;
}

/** The text without its code markers, for places that can only show plain text. */
export function toPlainText(text: string): string {
  return parseTextSegments(text)
    .map((segment) => (segment.kind === 'code-block' ? ` ${segment.text} ` : segment.text))
    .join('')
    .trim();
}

function findClosingFence(lines: string[], from: number): number {
  for (let i = from; i < lines.length; i++) {
    if (CLOSING_FENCE.test(lines[i])) {
      return i;
    }
  }
  return -1;
}

function parseInlineCode(text: string): TextSegment[] {
  const segments: TextSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE_CODE)) {
    if (match.index > last) {
      segments.push({ kind: 'text', text: text.slice(last, match.index) });
    }
    segments.push({ kind: 'inline-code', text: match[1] });
    last = match.index + match[0].length;
  }
  if (last < text.length) {
    segments.push({ kind: 'text', text: text.slice(last) });
  }
  return segments;
}
