import { TestBed } from '@angular/core/testing';
import { WpmMeter } from './wpm-meter';

describe('WpmMeter', () => {
  async function render(wpm: number, label?: string): Promise<HTMLElement> {
    const fixture = TestBed.createComponent(WpmMeter);
    fixture.componentRef.setInput('wpm', wpm);
    if (label) {
      fixture.componentRef.setInput('label', label);
    }
    await fixture.whenStable();
    return fixture.nativeElement.querySelector('.wpm-meter');
  }

  it('shows the speed with its level', async () => {
    const meter = await render(72);

    expect(meter.querySelector('.wpm-meter-label')?.textContent).toBe('Speed');
    expect(meter.querySelector('.wpm-meter-value')?.textContent).toBe('72');
    expect(meter.querySelector('.wpm-meter-unit')?.textContent).toBe('WPM · Fast');
    expect(meter.classList).toContain('wpm-meter-fast');
  });

  it('changes level with the speed', async () => {
    expect((await render(12)).classList).toContain('wpm-meter-slow');
    expect((await render(45)).classList).toContain('wpm-meter-good');
    expect((await render(120)).classList).toContain('wpm-meter-expert');
  });

  it('takes another label', async () => {
    const meter = await render(50, 'Average speed');

    expect(meter.textContent).toContain('Average speed');
  });
});
