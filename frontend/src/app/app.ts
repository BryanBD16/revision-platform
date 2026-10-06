import { Component, ElementRef, computed, inject, viewChild } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService, PERMISSIONS } from './auth/auth.service';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
  host: {
    '(document:click)': 'closeMenu($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly canManageRoles = computed(() => this.auth.can(PERMISSIONS.manageRoles));

  private readonly triviaMenu = viewChild.required<ElementRef<HTMLDetailsElement>>('triviaMenu');

  /** Closes the drop-down menu on a click outside of it, or on Escape. */
  protected closeMenu(event?: Event): void {
    const menu = this.triviaMenu().nativeElement;
    if (!event || !menu.contains(event.target as Node)) {
      menu.open = false;
    }
  }

  protected signOut(): void {
    this.auth.signOut().subscribe(() => this.router.navigateByUrl('/activities'));
  }
}
