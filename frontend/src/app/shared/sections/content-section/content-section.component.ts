import { CommonModule, DOCUMENT } from '@angular/common';
import { Component, Input, OnDestroy, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { ApiService } from '../../../core/api.service';
import { I18nService } from '../../../core/i18n.service';
import { ContactMessage, PageSection } from '../../../core/models';
import { TranslatePipe } from '../../../core/translate.pipe';
import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-content-section',
  standalone: true,
  imports: [CommonModule, FormsModule, ScrollRevealDirective, TranslatePipe],
  templateUrl: './content-section.component.html',
})
export class ContentSectionComponent implements OnDestroy {
  private readonly api = inject(ApiService);
  private readonly i18n = inject(I18nService);
  private readonly document = inject(DOCUMENT);

  @Input({ required: true }) section!: PageSection;

  messageStatus = '';
  message: ContactMessage = { full_name: '', email: '', subject: '', message: '' };
  selectedEvent: any | null = null;
  selectedEventImageIndex = 0;
  private lockedScrollY = 0;

  ngOnDestroy(): void {
    this.unlockBodyScroll();
  }

  title(): string {
    return this.i18n.localized(this.section.title_fr, this.section.title_en);
  }

  subtitle(): string {
    return this.i18n.localized(this.section.subtitle_fr, this.section.subtitle_en);
  }

  content(key: string): string {
    const value = this.section.content?.[key];
    return this.i18n.inlineLocalized(value);
  }

  text(value: unknown): string {
    return this.i18n.inlineLocalized(value);
  }

  arrayContent(key: string): any[] {
    const value = this.section.content?.[key];
    return Array.isArray(value) ? value : [];
  }

  objectContent(key: string): Record<string, any> {
    const value = this.section.content?.[key];
    return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};
  }

  backgroundStyle(): Record<string, string> {
    const url = this.content('backgroundImageUrl');
    return url
      ? {
          backgroundImage: `linear-gradient(rgba(249, 249, 252, 0.58), rgba(249, 249, 252, 0.66)), url("${url}")`,
          backgroundPosition: this.content('backgroundPosition') || 'center',
          backgroundSize: 'cover',
        }
      : {};
  }

  eventImages(event: any): any[] {
    const images: any[] = Array.isArray(event?.images) ? event.images : [];
    if (images.length) {
      return images.filter((image) => image?.url);
    }
    return this.section.media?.url ? [{ url: this.section.media.url, altText: this.section.media.alt_text }] : [];
  }

  openEventDetail(event: any): void {
    this.selectedEvent = event;
    this.selectedEventImageIndex = 0;
    this.lockBodyScroll();
  }

  closeEventDetail(): void {
    this.selectedEvent = null;
    this.selectedEventImageIndex = 0;
    this.unlockBodyScroll();
  }

  nextEventImage(): void {
    const images = this.eventImages(this.selectedEvent);
    if (images.length > 1) {
      this.selectedEventImageIndex = (this.selectedEventImageIndex + 1) % images.length;
    }
  }

  previousEventImage(): void {
    const images = this.eventImages(this.selectedEvent);
    if (images.length > 1) {
      this.selectedEventImageIndex = (this.selectedEventImageIndex - 1 + images.length) % images.length;
    }
  }

  private lockBodyScroll(): void {
    const body = this.document.body;
    if (body.style.position === 'fixed') {
      return;
    }

    this.lockedScrollY = this.document.defaultView?.scrollY ?? 0;
    body.style.position = 'fixed';
    body.style.top = `-${this.lockedScrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.width = '100%';
    body.style.overflow = 'hidden';
  }

  private unlockBodyScroll(): void {
    const body = this.document.body;
    if (body.style.position !== 'fixed') {
      return;
    }

    const root = this.document.documentElement;
    const previousScrollBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    body.style.position = '';
    body.style.top = '';
    body.style.left = '';
    body.style.right = '';
    body.style.width = '';
    body.style.overflow = '';
    this.document.defaultView?.scrollTo(0, this.lockedScrollY);
    this.document.defaultView?.requestAnimationFrame(() => {
      root.style.scrollBehavior = previousScrollBehavior;
    });
    this.lockedScrollY = 0;
  }

  sendMessage(): void {
    this.api.sendMessage(this.message).subscribe(() => {
      this.messageStatus = this.i18n.language() === 'fr' ? 'Message envoye.' : 'Message sent.';
      this.message = { full_name: '', email: '', subject: '', message: '' };
    });
  }
}
