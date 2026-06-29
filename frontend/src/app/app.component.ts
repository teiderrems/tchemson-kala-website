import { DOCUMENT } from '@angular/common';
import { Component, HostListener, OnInit, inject } from '@angular/core';
import { animate, group, query, style, transition, trigger } from '@angular/animations';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { I18nService } from './core/i18n.service';
import { ApiService } from './core/api.service';
import { TranslatePipe } from './core/translate.pipe';
import { InteractiveHelpComponent } from './shared/components/interactive-help/interactive-help.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, InteractiveHelpComponent],
  templateUrl: './app.component.html',
  animations: [
    trigger('routeAnimations', [
      transition('* <=> *', [
        style({ display: 'block', position: 'relative' }),
        query(
          ':enter, :leave',
          [
            style({
              left: 0,
              position: 'absolute',
              top: 0,
              width: '100%',
            }),
          ],
          { optional: true },
        ),
        query(':enter', [style({ opacity: 0, transform: 'translateY(18px) scale(0.985)' })], { optional: true }),
        group([
          query(':leave', [animate('170ms ease-out', style({ opacity: 0, transform: 'translateY(-8px) scale(0.995)' }))], {
            optional: true,
          }),
          query(':enter', [animate('280ms 70ms cubic-bezier(0.2, 0, 0, 1)', style({ opacity: 1, transform: 'none' }))], {
            optional: true,
          }),
        ]),
      ]),
    ]),
  ],
})
export class AppComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly document = inject(DOCUMENT);
  readonly i18n = inject(I18nService);
  showQuickNav = false;

  ngOnInit(): void {
    this.api.getSections().subscribe((sections) => {
      const settings = sections.find((section) => section.key === 'site-settings');
      const content = settings?.content ?? {};
      const backgroundUrl = typeof content['appBackgroundImageUrl'] === 'string' ? content['appBackgroundImageUrl'] : '';
      const backgroundPosition = typeof content['appBackgroundPosition'] === 'string' ? content['appBackgroundPosition'] : 'center';
      const backgroundOverlay =
        typeof content['appBackgroundOverlay'] === 'string' ? content['appBackgroundOverlay'] : 'rgba(249, 249, 252, 0.46)';
      this.applyAppBackground(backgroundUrl, backgroundPosition, backgroundOverlay);
    });
  }

  @HostListener('window:scroll')
  onWindowScroll(): void {
    this.showQuickNav = window.scrollY > 320;
  }

  getRouteAnimationData(outlet: RouterOutlet): string | undefined {
    return outlet?.activatedRouteData?.['animation'];
  }

  scrollToFirstSection(): void {
    const firstSection = document.querySelector<HTMLElement>('main section');
    if (firstSection) {
      firstSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private applyAppBackground(url: string, position: string, overlay: string): void {
    const root = this.document.documentElement;
    if (!url) {
      root.style.removeProperty('--app-background-image');
      root.style.removeProperty('--app-background-position');
      return;
    }

    root.style.setProperty('--app-background-image', `linear-gradient(${overlay}, ${overlay}), url("${url}")`);
    root.style.setProperty('--app-background-position', position);
  }
}
