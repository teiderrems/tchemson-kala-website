import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';

import { ApiService } from '../../core/api.service';
import { PageSection } from '../../core/models';
import { TranslatePipe } from '../../core/translate.pipe';
import { ContentSectionComponent } from '../../shared/sections/content-section/content-section.component';
import { HeroSectionComponent } from '../../shared/sections/hero-section/hero-section.component';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, HeroSectionComponent, ContentSectionComponent, TranslatePipe],
  templateUrl: './home.component.html',
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);

  sections: PageSection[] = [];

  get hero(): PageSection | undefined {
    return this.sections.find((section) => section.key === 'hero');
  }

  get normalSections(): PageSection[] {
    return this.sections.filter((section) => section.key !== 'hero' && section.key !== 'site-settings');
  }

  ngOnInit(): void {
    this.api.getSections().subscribe((sections) => (this.sections = sections));
  }
}
