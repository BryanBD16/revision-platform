import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormattedText } from './formatted-text';

describe('FormattedText', () => {
  let fixture: ComponentFixture<FormattedText>;
  let element: HTMLElement;

  async function show(text: string): Promise<void> {
    fixture.componentRef.setInput('text', text);
    await fixture.whenStable();
  }

  beforeEach(() => {
    fixture = TestBed.createComponent(FormattedText);
    element = fixture.nativeElement;
  });

  it('shows a text without code as it is', async () => {
    await show('Line one\nLine two');

    expect(element.textContent).toBe('Line one\nLine two');
    expect(element.querySelector('code')).toBeNull();
  });

  it('shows code blocks and inline code as code', async () => {
    await show('Read `p`:\n```\nint* p;\n    *p = 1;\n```\nWhat happens?');

    expect(element.querySelector('.inline-code')?.textContent).toBe('p');
    expect(element.querySelector('.code-block')?.textContent).toBe('int* p;\n    *p = 1;');
    expect(element.textContent).toBe('Read p:int* p;\n    *p = 1;What happens?');
  });

  it('shows markup in the text as text', async () => {
    await show('`<b>bold</b>` and <i>this</i>');

    expect(element.querySelector('b, i')).toBeNull();
    expect(element.textContent).toBe('<b>bold</b> and <i>this</i>');
  });
});
