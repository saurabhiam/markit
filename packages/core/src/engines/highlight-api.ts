import type { RendererInterface, ResolvedMatch, MarkitOptions } from '../types.js';

/**
 * Check whether the CSS Custom Highlight API is available.
 * Available in Chrome 105+, Firefox 140+, Safari 17.2+.
 */
export function isHighlightApiSupported(): boolean {
  return (
    typeof globalThis !== 'undefined' &&
    typeof CSS !== 'undefined' &&
    'highlights' in CSS
  );
}

/**
 * Zero-DOM-mutation renderer using the CSS Custom Highlight API.
 *
 * Creates Range objects for each match and registers them with
 * the browser's HighlightRegistry. Styling is done via the
 * `::highlight(<name>)` CSS pseudo-element.
 *
 * This renderer never modifies the DOM structure, making it safe
 * for Angular, React, and any framework that manages its own DOM tree.
 */
export class HighlightApiRenderer implements RendererInterface {
  private defaultName: string;
  private activeName: string;
  private ranges: Range[] = [];
  private highlight: Highlight | null = null;

  constructor(highlightName = 'markit-highlight') {
    this.defaultName = highlightName;
    this.activeName = highlightName;
  }

  render(matches: ResolvedMatch[], options: MarkitOptions): void {
    this.clear();
    this.activeName = options.highlightName ?? this.defaultName;
    this.renderBatch(matches, options);
  }

  renderBatch(matches: ResolvedMatch[], options: MarkitOptions): void {
    const name = options.highlightName ?? this.defaultName;
    this.activeName = name;

    for (const resolved of matches) {
      for (const segment of resolved.segments) {
        try {
          const range = document.createRange();
          range.setStart(segment.node, segment.startOffset);
          range.setEnd(segment.node, segment.endOffset);
          this.ranges.push(range);

          if (this.highlight) {
            this.highlight.add(range);
          }
        } catch {
          // Node may have been removed or offsets are stale — skip silently
        }
      }
    }

    if (!this.highlight && this.ranges.length > 0) {
      this.highlight = new Highlight(...this.ranges);
      CSS.highlights.set(name, this.highlight);
    }
  }

  clear(): void {
    CSS.highlights.delete(this.activeName);
    this.ranges = [];
    this.highlight = null;
  }

  destroy(): void {
    this.clear();
  }
}
