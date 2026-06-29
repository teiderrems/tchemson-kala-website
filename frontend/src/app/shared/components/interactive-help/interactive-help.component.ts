import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, inject } from '@angular/core';
import { NavigationEnd, Router, RouterLink } from '@angular/router';
import { Subscription, filter } from 'rxjs';

import { I18nService } from '../../../core/i18n.service';
import { TranslatePipe } from '../../../core/translate.pipe';

type HelpTab = 'overview' | 'actions' | 'checklist';

@Component({
  selector: 'app-interactive-help',
  standalone: true,
  imports: [CommonModule, RouterLink, TranslatePipe],
  templateUrl: './interactive-help.component.html',
})
export class InteractiveHelpComponent implements OnInit, OnDestroy {
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  open = false;
  activeTab: HelpTab = 'overview';
  currentUrl = this.router.url;
  private routerSubscription?: Subscription;

  ngOnInit(): void {
    this.routerSubscription = this.router.events.pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd)).subscribe((event) => {
      this.currentUrl = event.urlAfterRedirects;
      this.activeTab = 'overview';
    });
  }

  ngOnDestroy(): void {
    this.routerSubscription?.unsubscribe();
  }

  pageKey(): 'admin' | 'home' {
    return this.currentUrl.startsWith('/admin') ? 'admin' : 'home';
  }

  pageTitleKey(): string {
    return `help.${this.pageKey()}.title`;
  }

  pageSummaryKey(): string {
    return `help.${this.pageKey()}.summary`;
  }

  overviewKeys(): string[] {
    return this.keys('overview', this.pageKey() === 'admin' ? 5 : 4);
  }

  actionKeys(): string[] {
    return this.keys('actions', this.pageKey() === 'admin' ? 7 : 5);
  }

  checklistKeys(): string[] {
    return this.keys('checklist', this.pageKey() === 'admin' ? 5 : 4);
  }

  setTab(tab: HelpTab): void {
    this.activeTab = tab;
  }

  close(): void {
    this.open = false;
  }

  private keys(group: string, count: number): string[] {
    return Array.from({ length: count }, (_, index) => `help.${this.pageKey()}.${group}.${index + 1}`);
  }
}
