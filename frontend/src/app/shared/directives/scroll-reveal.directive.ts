import { isPlatformBrowser } from '@angular/common';
import { Directive, ElementRef, Inject, Input, OnDestroy, OnInit, PLATFORM_ID, Renderer2 } from '@angular/core';

@Directive({
  selector: '[appScrollReveal]',
  standalone: true,
})
export class ScrollRevealDirective implements OnInit, OnDestroy {
  @Input() revealDelay = 0;

  private observer: IntersectionObserver | null = null;

  constructor(
    private readonly elementRef: ElementRef<HTMLElement>,
    private readonly renderer: Renderer2,
    @Inject(PLATFORM_ID) private readonly platformId: object,
  ) {}

  ngOnInit(): void {
    const element = this.elementRef.nativeElement;
    this.renderer.addClass(element, 'scroll-reveal');
    this.renderer.setStyle(element, '--reveal-delay', `${this.revealDelay}ms`);

    if (!isPlatformBrowser(this.platformId)) {
      this.renderer.addClass(element, 'is-visible');
      return;
    }

    this.observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) {
          return;
        }
        this.renderer.addClass(element, 'is-visible');
        this.observer?.unobserve(element);
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 },
    );
    this.observer.observe(element);
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }
}
