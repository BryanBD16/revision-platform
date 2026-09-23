import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatchingForm, matchingModuleType } from '../matching-module-type';
import { MatchingEditor } from './matching-editor';

describe('MatchingEditor', () => {
  let fixture: ComponentFixture<MatchingEditor>;
  let element: HTMLElement;
  let form: MatchingForm;

  function field<T extends HTMLElement>(label: string): T {
    return element.querySelector<T>(`[aria-label="${label}"]`)!;
  }

  function type(label: string, value: string): void {
    const input = field<HTMLInputElement | HTMLTextAreaElement>(label);
    input.value = value;
    input.dispatchEvent(new Event('input'));
  }

  function button(label: string): HTMLButtonElement {
    return [...element.querySelectorAll('button')].find(
      (b) => b.getAttribute('aria-label') === label || b.textContent?.trim() === label,
    )!;
  }

  beforeEach(async () => {
    fixture = TestBed.createComponent(MatchingEditor);
    element = fixture.nativeElement;
    form = matchingModuleType.createForm();
    fixture.componentRef.setInput('form', form);
    await fixture.whenStable();
  });

  it('edits the concepts and definitions', () => {
    type('Concept 1', 'Mitosis');
    type('Definition 1', 'Two identical cells');

    expect(form.getRawValue().pairs[0]).toEqual({
      concept: 'Mitosis',
      definition: 'Two identical cells',
    });
  });

  it('adds and removes pairs, keeping at least two and at most ten', async () => {
    expect(button('Remove pair 1').disabled).toBe(true);

    for (let i = 0; i < 8; i++) {
      button('Add pair').click();
    }
    await fixture.whenStable();
    expect(form.controls.pairs.length).toBe(10);
    expect(button('Add pair').disabled).toBe(true);

    button('Remove pair 1').click();
    await fixture.whenStable();
    expect(form.controls.pairs.length).toBe(9);
  });

  it('reports missing texts once touched, and duplicates right away', async () => {
    type('Concept 1', 'Mitosis');
    type('Concept 2', 'mitosis');
    await fixture.whenStable();
    expect(element.textContent).toContain('Each concept must be different.');

    form.markAllAsTouched();
    await fixture.whenStable();
    expect(element.textContent).toContain('Pair 1 needs a definition.');
  });
});
