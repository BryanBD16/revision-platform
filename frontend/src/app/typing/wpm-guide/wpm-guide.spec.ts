import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { WpmGuide } from './wpm-guide';

describe('WpmGuide', () => {
  async function render(): Promise<HTMLElement> {
    TestBed.configureTestingModule({ providers: [provideRouter([])] });
    const fixture = TestBed.createComponent(WpmGuide);
    await fixture.whenStable();
    return fixture.nativeElement;
  }

  function tableRows(element: HTMLElement, index: number): (string | undefined)[][] {
    const table = element.querySelectorAll('table')[index];
    return [...table.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim()),
    );
  }

  it('explains the formula with the standard word length', async () => {
    const element = await render();

    expect(element.querySelector('.wpm-guide-formula')?.textContent).toContain(
      'WPM = (correct characters ÷ 5) ÷ minutes',
    );
    expect(element.textContent).toContain('measured over the last 10 seconds');
    expect(element.textContent).toContain('after the first 5 seconds');
  });

  it('shows the levels of the WPM meter with an example of each', async () => {
    const element = await render();

    expect(tableRows(element, 0).map((row) => row.slice(0, 2))).toEqual([
      ['Below average', '0 to 39 WPM'],
      ['Good', '40 to 69 WPM'],
      ['Fast', '70 to 99 WPM'],
      ['Expert', '100 WPM and more'],
    ]);
    const examples = [...element.querySelectorAll('table')[0].querySelectorAll('.wpm-meter')];
    expect(examples.map((meter) => meter.className)).toEqual([
      'wpm-meter wpm-meter-slow',
      'wpm-meter wpm-meter-good',
      'wpm-meter wpm-meter-fast',
      'wpm-meter wpm-meter-expert',
    ]);
  });

  it('gives typical speeds by age and by kind of work', async () => {
    const element = await render();

    expect(tableRows(element, 1)).toHaveLength(6);
    expect(tableRows(element, 2).map((row) => row[0])).toContain('Software development');
  });
});
