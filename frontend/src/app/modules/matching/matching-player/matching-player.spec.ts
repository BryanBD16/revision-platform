import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { ModuleResult } from '../../module-type';
import { MatchingContent } from '../matching-content';
import { MatchingPlayer } from './matching-player';

describe('MatchingPlayer', () => {
  let fixture: ComponentFixture<MatchingPlayer>;
  let element: HTMLElement;
  let completed: Mock<(result: ModuleResult | null) => void>;

  const content: MatchingContent = {
    instructions: null,
    pairs: [
      { id: 'p1', concept: 'Mitosis', definition: 'Two identical cells' },
      { id: 'p2', concept: 'Meiosis', definition: 'Gametes' },
      { id: 'p3', concept: 'Osmosis', definition: 'Water through a membrane' },
    ],
  };

  function select(concept: string): HTMLSelectElement {
    const label = [...element.querySelectorAll('label')].find((l) => l.textContent?.trim() === concept)!;
    return element.querySelector<HTMLSelectElement>(`#${label.htmlFor}`)!;
  }

  async function match(concept: string, definition: string): Promise<void> {
    const dropdown = select(concept);
    dropdown.value = [...dropdown.options].find((o) => o.text.trim() === definition)!.value;
    dropdown.dispatchEvent(new Event('change'));
    await fixture.whenStable();
  }

  function button(text: string): HTMLButtonElement {
    return [...element.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!;
  }

  async function click(text: string): Promise<void> {
    button(text).click();
    await fixture.whenStable();
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(MatchingPlayer);
    element = fixture.nativeElement;
    completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);
    fixture.componentRef.setInput('content', content);
    await fixture.whenStable();
  });

  it('offers every definition to each concept, in a shuffled order', () => {
    const options = [...select('Mitosis').options].map((o) => o.text.trim());

    expect(options[0]).toBe('Choose a definition…');
    expect(options.slice(1).sort()).toEqual(content.pairs.map((p) => p.definition).sort());
    expect(options.slice(1)).not.toEqual(content.pairs.map((p) => p.definition));
  });

  it('shows the default instructions, or the ones of the module', async () => {
    expect(element.textContent).toContain('Match each concept with its definition.');

    fixture.componentRef.setInput('content', { ...content, instructions: 'Match the processes.' });
    await fixture.whenStable();

    expect(element.textContent).toContain('Match the processes.');
  });

  it('can only check the answers once every concept is matched', async () => {
    await match('Mitosis', 'Two identical cells');
    await match('Meiosis', 'Gametes');
    expect(button('Check answers').disabled).toBe(true);

    await match('Osmosis', 'Water through a membrane');
    expect(button('Check answers').disabled).toBe(false);
  });

  it('gives one point per correct match and shows the corrections', async () => {
    await match('Mitosis', 'Two identical cells');
    await match('Meiosis', 'Water through a membrane');
    await match('Osmosis', 'Gametes');

    await click('Check answers');

    expect(element.textContent).toContain('You matched 1 of 3 concepts correctly.');
    expect(element.querySelector('.pair-correct')?.textContent).toContain('Mitosis');
    const wrong = [...element.querySelectorAll('.pair-wrong')].map((p) => p.textContent);
    expect(wrong).toEqual([
      expect.stringContaining('Correct definition: Gametes'),
      expect.stringContaining('Correct definition: Water through a membrane'),
    ]);
    expect(select('Mitosis').disabled).toBe(true);

    await click('Continue');
    expect(completed).toHaveBeenCalledExactlyOnceWith({ score: 1, maxScore: 3 });
  });

  it('gives all the points when every match is correct', async () => {
    for (const pair of content.pairs) {
      await match(pair.concept, pair.definition);
    }

    await click('Check answers');
    await click('Continue');

    expect(completed).toHaveBeenCalledExactlyOnceWith({ score: 3, maxScore: 3 });
  });

  it('lets the learner undo a match', async () => {
    for (const pair of content.pairs) {
      await match(pair.concept, pair.definition);
    }

    await match('Mitosis', 'Choose a definition…');

    expect(button('Check answers').disabled).toBe(true);
  });
});
