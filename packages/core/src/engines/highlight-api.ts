import type { RendererInterface, ResolvedMatch, MarkitOptions } from '../types.js';

/** Shared highlight for default name so multiple instances don't overwrite each other. */
const DEFAULT_NAME = 'markit-highlight';
let sharedHighlight: Highlight | null = null;

/**
 * Check whether the CSS Custom Highlight API is available.
 * Available in Chrome 105+, Firefox 140+, Safari 17.2+.
 */
export function isHighlightApiSupported(): boolean {
  return typeof globalThis !== 'undefined' && typeof CSS !== 'undefined' && 'highlights' in CSS;
}

/**
 * Zero-DOM-mutation renderer using the CSS Custom Highlight API.
 *
 * Creates Range objects for each match and registers them with
 * the browser's HighlightRegistry. Styling is done via the
 * `::highlight(<name>)` CSS pseudo-element.
 *
 * When using the default highlight name, multiple instances share
 * one Highlight so they don't overwrite each other in the registry.
 */
export class HighlightApiRenderer implements RendererInterface {
  private defaultName: string;
  private activeName: string;
  private ranges: Range[] = [];
  private highlight: Highlight | null = null;
  private useShared: boolean = false;

  constructor(highlightName = DEFAULT_NAME) {
    this.defaultName = highlightName;
    this.activeName = highlightName;
    this.useShared = highlightName === DEFAULT_NAME;
  }

  render(matches: ResolvedMatch[], options: MarkitOptions): void {
    this.clear();
    this.activeName = options.highlightName ?? this.defaultName;
    this.useShared = this.activeName === DEFAULT_NAME;
    this.renderBatch(matches, options);
  }

  renderBatch(matches: ResolvedMatch[], options: MarkitOptions): void {
    const name = options.highlightName ?? this.defaultName;
    this.activeName = name;
    this.useShared = name === DEFAULT_NAME;

    if (this.useShared) {
      if (!sharedHighlight) {
        sharedHighlight = new Highlight();
        CSS.highlights.set(DEFAULT_NAME, sharedHighlight);
      }
      this.highlight = sharedHighlight;
    }

    for (const resolved of matches) {
      for (const segment of resolved.segments) {
        try {
          const range = document.createRange();
          range.setStart(segment.node, segment.startOffset);
          range.setEnd(segment.node, segment.endOffset);
          this.ranges.push(range);
          if (this.useShared) {
            sharedHighlight!.add(range);
          } else {
            if (!this.highlight) this.highlight = new Highlight();
            this.highlight.add(range);
          }
        } catch {
          // Node may have been removed or offsets are stale — skip silently
        }
      }
    }

    if (!this.useShared && this.highlight && this.ranges.length > 0) {
      CSS.highlights.set(name, this.highlight);
    }
  }

  clear(): void {
    for (const range of this.ranges) {
      (this.highlight ?? sharedHighlight)?.delete(range);
    }
    this.ranges = [];
    if (!this.useShared) {
      if (this.activeName) CSS.highlights.delete(this.activeName);
      this.highlight = null;
    }
  }

  destroy(): void {
    this.clear();
  }
}
