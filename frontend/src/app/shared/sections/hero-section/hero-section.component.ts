import { CommonModule } from '@angular/common';
import { Component, Input, inject } from '@angular/core';

import { I18nService } from '../../../core/i18n.service';
import { PageSection } from '../../../core/models';
import { TranslatePipe } from '../../../core/translate.pipe';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-hero-section',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective, TranslatePipe],
  templateUrl: './hero-section.component.html',
})
export class HeroSectionComponent {
  readonly defaultImageUrl = '/assets/logo.jpeg';
  private readonly i18n = inject(I18nService);

  @Input() section: PageSection | undefined;

  title(): string {
    return this.i18n.localized(this.section?.title_fr, this.section?.title_en);
  }

  subtitle(): string {
    return this.i18n.localized(this.section?.subtitle_fr, this.section?.subtitle_en);
  }

  content(key: string): string {
    const value = this.section?.content?.[key];
    return this.i18n.inlineLocalized(value);
  }

  text(value: unknown): string {
    return this.i18n.inlineLocalized(value);
  }

  academicYearBadge(): string {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startMonth = this.academicYearStartMonth();
    const startYear = currentMonth >= startMonth ? currentYear : currentYear - 1;
    const label = this.i18n.language() === 'fr' ? 'Annee scolaire' : 'Academic Year';
    return `${label} ${startYear} - ${startYear + 1}`;
  }

  arrayContent(key: string): any[] {
    const value = this.section?.content?.[key];
    return Array.isArray(value) ? value : [];
  }

  imageUrl(): string {
    return this.section?.media?.url || this.defaultImageUrl;
  }

  imageAlt(): string {
    return this.section?.media?.alt_text || this.title() || 'Tchemson-Kala';
  }

  isDefaultImage(): boolean {
    return !this.section?.media?.url;
  }

  backgroundStyle(): Record<string, string> {
    const url = this.content('backgroundImageUrl');
    return url
      ? {
          backgroundImage: `linear-gradient(rgba(249, 249, 252, 0.5), rgba(249, 249, 252, 0.6)), url("${url}")`,
          backgroundPosition: this.content('backgroundPosition') || 'center',
          backgroundSize: 'cover',
        }
      : {};
  }

  private academicYearStartMonth(): number {
    const value = Number(this.section?.content?.['academicYearStartMonth']);
    return Number.isInteger(value) && value >= 1 && value <= 12 ? value : 9;
  }
}
