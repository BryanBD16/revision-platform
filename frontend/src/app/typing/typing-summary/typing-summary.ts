import { Component, OnInit, inject, input, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { SaveTypingResultRequest } from '../typing';
import { TypingApi } from '../typing-api';
import { WpmMeter } from '../wpm-meter/wpm-meter';

/**
 * The end of a test, whatever its mode: the average and highest speeds, the accuracy, and
 * the saving of the result for signed-in users. The mode adds its own actions inside.
 */
@Component({
  selector: 'app-typing-summary',
  imports: [RouterLink, WpmMeter],
  templateUrl: './typing-summary.html',
})
export class TypingSummary implements OnInit {
  private readonly typingApi = inject(TypingApi);

  readonly heading = input('Test finished');
  readonly result = input.required<SaveTypingResultRequest>();
  readonly accuracy = input.required<number>();

  protected readonly signedIn = inject(AuthService).signedIn;
  protected readonly saveStatus = signal<'idle' | 'saving' | 'saved' | 'error'>('idle');

  ngOnInit(): void {
    if (this.signedIn()) {
      this.save();
    }
  }

  /** Saves the result; also used to retry after a failure. */
  protected save(): void {
    this.saveStatus.set('saving');
    this.typingApi.saveResult(this.result()).subscribe({
      next: () => this.saveStatus.set('saved'),
      error: () => this.saveStatus.set('error'),
    });
  }
}
