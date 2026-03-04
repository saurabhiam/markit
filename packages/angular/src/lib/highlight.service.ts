import { Injectable, NgZone } from '@angular/core';
import { markit } from '@markit/core';
import type { MarkitInstance, MarkitOptions, MarkitPlugin } from '@markit/core';

/**
 * Injectable service for programmatic text highlighting.
 *
 * Use this when you need more control than the directive provides,
 * such as highlighting from a service, managing multiple instances,
 * or integrating with complex component logic.
 *
 * All operations run outside NgZone by default.
 *
 * @example
 * ```typescript
 * @Component({ ... })
 * export class SearchComponent implements OnDestroy {
 *   private highlighter: MarkitInstance | null = null;
 *
 *   constructor(
 *     private markitService: MarkitService,
 *     private el: ElementRef,
 *   ) {}
 *
 *   onSearch(term: string) {
 *     this.highlighter?.destroy();
 *     this.highlighter = this.markitService.create(this.el.nativeElement);
 *     this.markitService.highlight(this.highlighter, term);
 *   }
 *
 *   ngOnDestroy() {
 *     this.highlighter?.destroy();
 *   }
 * }
 * ```
 */
@Injectable({ providedIn: 'root' })
export class MarkitService {
  constructor(private ngZone: NgZone) {}

  /**
   * Create a new MarkIt instance bound to an element.
   * The instance is created outside NgZone.
   */
  create(element: HTMLElement, plugins?: MarkitPlugin[]): MarkitInstance {
    return this.ngZone.runOutsideAngular(() => {
      return markit(element, plugins);
    });
  }

  /**
   * Apply keyword highlighting on an existing instance.
   */
  highlight(
    instance: MarkitInstance,
    term: string | string[],
    options?: Partial<MarkitOptions>,
  ): void {
    this.ngZone.runOutsideAngular(() => {
      instance.mark(term, options);
    });
  }

  /**
   * Apply regex highlighting on an existing instance.
   */
  highlightRegExp(
    instance: MarkitInstance,
    regexp: RegExp,
    options?: Partial<MarkitOptions>,
  ): void {
    this.ngZone.runOutsideAngular(() => {
      instance.markRegExp(regexp, options);
    });
  }

  /**
   * Clear all highlights on an instance.
   */
  clear(instance: MarkitInstance): void {
    this.ngZone.runOutsideAngular(() => {
      instance.unmark();
    });
  }
}
