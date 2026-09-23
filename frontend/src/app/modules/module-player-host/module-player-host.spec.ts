import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModulePlayerHost } from './module-player-host';

describe('ModulePlayerHost', () => {
  let fixture: ComponentFixture<ModulePlayerHost>;
  let element: HTMLElement;

  beforeEach(() => {
    fixture = TestBed.createComponent(ModulePlayerHost);
    element = fixture.nativeElement;
  });

  it('renders the player of the module type and forwards its completion', async () => {
    fixture.componentRef.setInput('module', {
      id: 1,
      position: 0,
      type: 'reading',
      content: { title: null, body: 'Some text' },
    });
    await fixture.whenStable();
    const completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);

    expect(element.querySelector('app-reading-player')?.textContent).toContain('Some text');
    element.querySelector('button')!.click();
    expect(completed).toHaveBeenCalledOnce();
  });

  it('replaces the player when the module changes', async () => {
    fixture.componentRef.setInput('module', {
      id: 1, position: 0, type: 'reading', content: { title: null, body: 'First' },
    });
    await fixture.whenStable();
    fixture.componentRef.setInput('module', {
      id: 2, position: 1, type: 'reading', content: { title: null, body: 'Second' },
    });
    await fixture.whenStable();

    const players = element.querySelectorAll('app-reading-player');
    expect(players.length).toBe(1);
    expect(players[0].textContent).toContain('Second');
  });

  it('lets the learner skip a module of an unknown type', async () => {
    fixture.componentRef.setInput('module', { id: 1, position: 0, type: 'unknown', content: {} });
    await fixture.whenStable();
    const completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);

    expect(element.textContent).toContain('Unknown module type "unknown"');
    element.querySelector('button')!.click();
    expect(completed).toHaveBeenCalledOnce();
  });
});
