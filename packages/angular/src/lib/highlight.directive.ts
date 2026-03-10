import {
  Directive,
  ElementRef,
  Input,
  NgZone,
  AfterViewChecked,
  OnChanges,
  OnDestroy,
  SimpleChanges,
} from '@angular/core';
import { markit } from '@markitjs/core';
import type { MarkitInstance, MarkitOptions, MarkitPlugin } from '@markitjs/core';

/** Returns true when previous and current content key value(s) differ (single value or array, shallow comparison). */
function contentKeyValuesChanged(
  previous: string | number | (string | number)[] | undefined,
  current: string | number | (string | number)[] | undefined,
): boolean {
  if (previous === current) return false;
  if (previous == null || current == null) return true;
  if (Array.isArray(previous) && Array.isArray(current)) {
    if (previous.length !== current.length) return true;
    return previous.some((v, i) => current[i] !== v);
  }
  if (Array.isArray(previous) !== Array.isArray(current)) return true;
  return previous !== current;
}

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
 *
 * When the host element's content is bound to a signal or other dynamic value,
 * pass [markitContentKey] so the directive unmarks before and re-applies after
 * content updates, avoiding garbled text (e.g. "HellWorld" instead of "World").
 * You can pass a single value or an array of keys; when any key changes, the
 * directive will re-apply. When markitContentKey is not passed, content is
 * treated as static (no per-CD cleanup); pass it for dynamic content.
 */
@Directive({
  selector: '[markitHighlight]',
  standalone: true,
})
export class MarkitHighlightDirective implements OnChanges, AfterViewChecked, OnDestroy {
  @Input('markitHighlight') searchTerm: string | string[] = '';
  @Input() markitOptions: Partial<MarkitOptions> = {};
  @Input() markitPlugins: MarkitPlugin[] = [];
  /** Single key or array of keys; when any key changes, the directive will unmark and re-apply. Pass the same value(s) as your bound content (e.g. signals). Omit for static content (default). */
  @Input() markitContentKey?: string | number | (string | number)[];

  private instance: MarkitInstance | null = null;
  private previousContentKey: string | number | (string | number)[] | undefined = undefined;
  private contentKeyChanged = false;
  private lastAppliedContent: string | null = null;

  constructor(
    private el: ElementRef<HTMLElement>,
    private ngZone: NgZone,
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    const contentKeyChange = changes['markitContentKey'];
    const contentKeyDidChange =
      contentKeyChange &&
      (contentKeyChange.firstChange ||
        contentKeyValuesChanged(contentKeyChange.previousValue, contentKeyChange.currentValue));

    if (contentKeyDidChange) {
      this.ngZone.runOutsideAngular(() => {
        this.cleanup();
      });
      this.contentKeyChanged = true;
      // Re-apply will happen in ngAfterViewChecked after the view has updated.
      return;
    }

    // Only searchTerm or options changed — apply as before.
    this.ngZone.runOutsideAngular(() => {
      this.applyHighlight();
    });
  }

  ngAfterViewChecked(): void {
    const term = this.searchTerm;
    const hasTerm = term && (!Array.isArray(term) || term.length > 0);

    if (this.contentKeyChanged && hasTerm) {
      this.ngZone.runOutsideAngular(() => {
        this.applyHighlight();
      });
      this.contentKeyChanged = false;
      this.previousContentKey = this.markitContentKey;
      return;
    }

    // When markitContentKey is not passed, content is treated as static — skip re-apply on content change.
    if (this.markitContentKey === undefined) return;
    if (!hasTerm || this.instance !== null) return;

    const currentContent = this.el.nativeElement.textContent ?? '';
    if (currentContent !== this.lastAppliedContent) {
      this.ngZone.runOutsideAngular(() => {
        this.applyHighlight();
      });
    }
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
    this.lastAppliedContent = this.el.nativeElement.textContent ?? null;
  }

  private cleanup(): void {
    if (this.instance) {
      this.instance.destroy();
      this.instance = null;
      this.lastAppliedContent = null;
    }
  }
}
