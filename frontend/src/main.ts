import { provideHttpClient } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideRouter, withInMemoryScrolling } from '@angular/router';

import { AppComponent } from './app/app.component';
import { AdminComponent } from './app/features/admin/admin.component';
import { HomeComponent } from './app/features/home/home.component';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(),
    provideAnimationsAsync("animations"),
    provideRouter(
      [
        { path: '', component: HomeComponent, data: { animation: 'home' } },
        { path: 'admin', component: AdminComponent, data: { animation: 'admin' } },
        { path: '**', redirectTo: '' },
      ],
      withInMemoryScrolling({ anchorScrolling: 'enabled', scrollPositionRestoration: 'enabled' }),
    ),
  ],
}).catch((err) => console.error(err));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch((error) => {
      console.warn('Service worker registration failed', error);
    });
  });
}
