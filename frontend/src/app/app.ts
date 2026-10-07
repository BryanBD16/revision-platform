import { Component, ElementRef, computed, inject } from '@angular/core';
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

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Closes the drop-down menus on a click outside of them, or on Escape. */
  protected closeMenu(event?: Event): void {
    for (const menu of this.host.nativeElement.querySelectorAll('details.nav-menu')) {
      if (!event || !menu.contains(event.target as Node)) {
        (menu as HTMLDetailsElement).open = false;
      }
    }
  }

  protected signOut(): void {
    this.auth.signOut().subscribe(() => this.router.navigateByUrl('/activities'));
  }
}
