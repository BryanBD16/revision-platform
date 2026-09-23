import { Component, computed, inject } from '@angular/core';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthService, PERMISSIONS } from './auth/auth.service';

@Component({
  imports: [RouterLink, RouterOutlet],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly canManageRoles = computed(() => this.auth.can(PERMISSIONS.manageRoles));

  protected signOut(): void {
    this.auth.signOut().subscribe(() => this.router.navigateByUrl('/activities'));
  }
}
