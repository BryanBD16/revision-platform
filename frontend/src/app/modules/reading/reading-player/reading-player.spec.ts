import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReadingPlayer } from './reading-player';

describe('ReadingPlayer', () => {
  let fixture: ComponentFixture<ReadingPlayer>;
  let element: HTMLElement;

  beforeEach(async () => {
    fixture = TestBed.createComponent(ReadingPlayer);
    element = fixture.nativeElement;
  });

  it('shows the title and the text', async () => {
    fixture.componentRef.setInput('content', { title: 'Introduction', body: 'Some text' });
    await fixture.whenStable();

    expect(element.querySelector('h3')?.textContent).toBe('Introduction');
    expect(element.textContent).toContain('Some text');
  });

  it('shows no heading when there is no title', async () => {
    fixture.componentRef.setInput('content', { title: null, body: 'Some text' });
    await fixture.whenStable();

    expect(element.querySelector('h3')).toBeNull();
  });

  it('completes without a grade when the learner continues', async () => {
    fixture.componentRef.setInput('content', { title: null, body: 'Some text' });
    await fixture.whenStable();
    const completed = vi.fn();
    fixture.componentInstance.completed.subscribe(completed);

    element.querySelector('button')!.click();

    expect(completed).toHaveBeenCalledExactlyOnceWith(null);
  });
});
