import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TypingArea, TypingProgress } from './typing-area';

describe('TypingArea', () => {
  let fixture: ComponentFixture<TypingArea>;
  let box: HTMLElement;
  let progress: TypingProgress[];

  async function create(text: string, disabled = false): Promise<void> {
    fixture = TestBed.createComponent(TypingArea);
    fixture.componentRef.setInput('text', text);
    fixture.componentRef.setInput('disabled', disabled);
    progress = [];
    fixture.componentInstance.progress.subscribe((p) => progress.push(p));
    await fixture.whenStable();
    box = fixture.nativeElement.querySelector('.typing-area');
  }

  async function press(key: string, options: KeyboardEventInit = {}): Promise<KeyboardEvent> {
    const event = new KeyboardEvent('keydown', { key, cancelable: true, ...options });
    box.dispatchEvent(event);
    await fixture.whenStable();
    return event;
  }

  async function type(keys: string): Promise<void> {
    for (const key of keys) {
      await press(key);
    }
  }

  function states(): string[] {
    return [...box.querySelectorAll('.typing-char')].map((c) =>
      c.className.replace('typing-char typing-char-', ''),
    );
  }

  it('shows the text with a caret before the first character', async () => {
    await create('ab c');

    const chars = [...box.querySelectorAll('.typing-char')].map((c) => c.textContent);
    expect(chars).toEqual(['a', 'b', ' ', 'c']);
    expect(states()).toEqual(['current', 'pending', 'pending', 'pending']);
  });

  it('marks the typed characters as right or wrong and reports the progress', async () => {
    await create('ab c');

    await type('ax ');

    expect(states()).toEqual(['correct', 'incorrect', 'correct', 'current']);
    expect(progress.at(-1)).toEqual({
      typed: 'ax ',
      correctChars: 2,
      keystrokes: 3,
      correctKeystrokes: 2,
    });
  });

  it('corrects a character with Backspace, which still counts the wrong keystroke', async () => {
    await create('ab c');
    await type('ax');

    const event = await press('Backspace');
    await type('b');

    expect(event.defaultPrevented).toBe(true);
    expect(states()).toEqual(['correct', 'correct', 'current', 'pending']);
    expect(progress.at(-1)).toEqual({
      typed: 'ab',
      correctChars: 2,
      keystrokes: 3,
      correctKeystrokes: 2,
    });
  });

  it('corrects a whole word with Ctrl+Backspace', async () => {
    await create('one two three');
    await type('one twx');

    await press('Backspace', { ctrlKey: true });

    expect(progress.at(-1)?.typed).toBe('one ');
  });

  it('stops at the end of the text', async () => {
    await create('ab');

    await type('abc');

    expect(progress.at(-1)?.typed).toBe('ab');
    expect(progress.length).toBe(2);
  });

  it('ignores other keys and shortcuts', async () => {
    await create('ab');

    const shift = await press('Shift');
    await press('c', { ctrlKey: true });
    await press('v', { metaKey: true });

    expect(shift.defaultPrevented).toBe(false);
    expect(progress).toEqual([]);
  });

  it('does not take keys when disabled', async () => {
    await create('ab', true);

    await type('a');

    expect(progress).toEqual([]);
    expect(states()[0]).toBe('current');
  });
});
