import {
  Directive,
  ElementRef,
  Input,
  NgZone,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { markit } from '@markitjs/core';
import type { MarkitInstance, MarkitOptions, MarkitPlugin } from '@markitjs/core';

/**
 * Attribute directive for text highlighting in Angular templates.
 *
 * Runs highlighting OUTSIDE NgZone to avoid triggering unnecessary
 * change detection cycles. The CSS Highlight API engine (default)
 * creates zero DOM mutations, preserving all Angular bindings,
 * event listeners, and component tree structure.
 *
 * Compatible with:
 * - OnPush change detection (triggers via OnChanges on input binding)
 * - Signals (wrap search term in a signal, bind in template)
 * - Zone-based and zoneless Angular apps
 *
 * @example
 * ```html
 * <div [markitHighlight]="searchTerm" [markitOptions]="{ caseSensitive: false }">
 *   <p>This content will be searched and highlighted.</p>
 *   <app-child></app-child> <!-- bindings preserved -->
 * </div>
 * ```
 */
@Directive({
  selector: '[markitHighlight]',
  standalone: true,
})
export class MarkitHighlightDirective implements OnChanges, OnDestroy {
  @Input('markitHighlight') searchTerm: string | string[] = '';
  @Input() markitOptions: Partial<MarkitOptions> = {};
  @Input() markitPlugins: MarkitPlugin[] = [];

  private instance: MarkitInstance | null = null;

  constructor(
    private el: ElementRef<HTMLElement>,
    private ngZone: NgZone,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    // Run outside Angular's zone to avoid triggering change detection
    // for DOM mutations (if using DOM renderer) or Range creation
    this.ngZone.runOutsideAngular(() => {
      this.applyHighlight();
    });
  }

  ngOnDestroy(): void {
    this.ngZone.runOutsideAngular(() => {
      this.cleanup();
    });
  }

  private applyHighlight(): void {
    this.cleanup();

    const term = this.searchTerm;
    if (!term || (Array.isArray(term) && term.length === 0)) {
      return;
    }

    this.instance = markit(this.el.nativeElement, this.markitPlugins);

    const doneCallback = this.markitOptions.done;
    const noMatchCallback = this.markitOptions.noMatch;

    const options: Partial<MarkitOptions> = {
      ...this.markitOptions,
      done: doneCallback
        ? (count: number) => {
            // Re-enter the zone for consumer callbacks that may
            // trigger change detection (e.g., updating a match count)
            this.ngZone.run(() => doneCallback(count));
          }
        : undefined,
      noMatch: noMatchCallback
        ? (t: string) => {
            this.ngZone.run(() => noMatchCallback(t));
          }
        : undefined,
    };

    this.instance.mark(term, options);
  }

  private cleanup(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
    }
  }
}
