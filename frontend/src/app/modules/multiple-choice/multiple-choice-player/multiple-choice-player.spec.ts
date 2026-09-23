import { ComponentFixture, TestBed } from '@angular/core/testing';
import type { Mock } from 'vitest';
import { ModuleResult } from '../../module-type';
import { MultipleChoiceContent } from '../multiple-choice-content';
import { MultipleChoicePlayer } from './multiple-choice-player';

describe('MultipleChoicePlayer', () => {
  let fixture: ComponentFixture<MultipleChoicePlayer>;
  let element: HTMLElement;
  let completed: Mock<(result: ModuleResult | null) => void>;

  async function show(content: Partial<MultipleChoiceContent>): Promise<void> {
    fixture.componentRef.setInput('content', {
      question: 'What is a cell?',
      choices: [
        { id: 'a', text: 'The basic unit of life' },
        { id: 'b', text: 'A planet' },
        { id: 'c', text: 'A living unit' },
      ],
      correctChoiceIds: ['a'],
      explanation: null,
      ...content,
    });
    await fixture.whenStable();
  }

  function inputs(): HTMLInputElement[] {
    return [...element.querySelectorAll<HTMLInputElement>('.choice input')];
  }

  async function choose(text: string): Promise<void> {
    const label = [...element.querySelectorAll('.choice')].find((l) => l.textContent?.includes(text));
    label!.querySelector('input')!.click();
    await fixture.whenStable();
  }

  async function clickButton(text: string): Promise<void> {
    [...element.querySelectorAll('button')].find((b) => b.textContent?.includes(text))!.click();
    await fixture.whenStable();
  }

  function button(text: string): HTMLButtonElement | undefined {
    return [...element.querySelectorAll('button')].find((b) => b.textContent?.includes(text));
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(MultipleChoicePlayer);
    element = fixture.nativeElement;
    completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);
  });

  it('shows the question with one radio button per choice', async () => {
    await show({});

    expect(element.textContent).toContain('What is a cell?');
    expect(inputs().map((input) => input.type)).toEqual(['radio', 'radio', 'radio']);
    expect(element.textContent).not.toContain('Select all the correct answers.');
  });

  it('can only check the answer once a choice is selected', async () => {
    await show({});
    expect(button('Check answer')!.disabled).toBe(true);

    await choose('A planet');

    expect(button('Check answer')!.disabled).toBe(false);
  });

  it('gives 1 out of 1 for the correct answer', async () => {
    await show({});
    await choose('The basic unit of life');

    await clickButton('Check answer');
    expect(element.textContent).toContain('Correct!');
    expect(completed).not.toHaveBeenCalled();

    await clickButton('Continue');
    expect(completed).toHaveBeenCalledExactlyOnceWith({ score: 1, maxScore: 1 });
  });

  it('shows the correction and the explanation for a wrong answer, then gives 0 out of 1', async () => {
    await show({ explanation: 'All living organisms are made of cells.' });
    await choose('A planet');

    await clickButton('Check answer');

    expect(element.textContent).toContain('Incorrect.');
    expect(element.textContent).toContain('All living organisms are made of cells.');
    expect(element.querySelector('.choice-correct')?.textContent).toContain('The basic unit of life');
    expect(element.querySelector('.choice-wrong')?.textContent).toContain('A planet');
    expect(inputs().every((input) => input.closest('fieldset')!.disabled)).toBe(true);

    await clickButton('Continue');
    expect(completed).toHaveBeenCalledExactlyOnceWith({ score: 0, maxScore: 1 });
  });

  it('keeps only the last choice with radio buttons', async () => {
    await show({});
    await choose('A planet');
    await choose('The basic unit of life');

    await clickButton('Check answer');

    expect(element.textContent).toContain('Correct!');
  });

  describe('with several correct answers', () => {
    beforeEach(() => show({ correctChoiceIds: ['a', 'c'] }));

    it('uses checkboxes and says to select all correct answers', () => {
      expect(inputs().map((input) => input.type)).toEqual(['checkbox', 'checkbox', 'checkbox']);
      expect(element.textContent).toContain('Select all the correct answers.');
    });

    it('is correct only when all the correct choices are selected', async () => {
      await choose('The basic unit of life');
      await choose('A living unit');

      await clickButton('Check answer');
      await clickButton('Continue');

      expect(completed).toHaveBeenCalledExactlyOnceWith({ score: 1, maxScore: 1 });
    });

    it('is wrong when a correct choice is missing', async () => {
      await choose('The basic unit of life');

      await clickButton('Check answer');
      await clickButton('Continue');

      expect(completed).toHaveBeenCalledExactlyOnceWith({ score: 0, maxScore: 1 });
    });

    it('lets the learner unselect a choice', async () => {
      await choose('The basic unit of life');
      await choose('A planet');
      await choose('A planet');
      await choose('A living unit');

      await clickButton('Check answer');

      expect(element.textContent).toContain('Correct!');
    });
  });
});
