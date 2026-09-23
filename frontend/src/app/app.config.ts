import {
  ApplicationConfig,
  inject,
  provideAppInitializer,
  provideBrowserGlobalErrorListeners,
} from '@angular/core';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { routes } from './app.routes';
import { AuthService } from './auth/auth.service';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // HttpClient sends the anti-forgery token of the XSRF-TOKEN cookie in the
    // X-XSRF-TOKEN header of POST, PUT and DELETE requests (Angular's default names).
    provideHttpClient(withFetch()),
    provideRouter(routes, withComponentInputBinding()),
    // Know who is signed in before the first page is shown (and receive an anti-forgery token).
    provideAppInitializer(() => inject(AuthService).load()),
  ],
};
