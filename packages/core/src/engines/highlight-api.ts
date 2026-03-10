import type { RendererInterface, ResolvedMatch, MarkitOptions } from '../types.js';

/** Default registry name for the CSS Highlight API. */
const DEFAULT_NAME = 'markit-highlight';

/** One shared Highlight per registry name (default or custom) so multiple instances add ranges to the same Highlight instead of overwriting. */
const highlightsByName = new Map<string, Highlight>();

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
 * One Highlight per registry name (default or custom) is shared by all
 * instances using that name, so multiple instances do not overwrite each other.
 */
export class HighlightApiRenderer implements RendererInterface {
  private defaultName: string;
  private activeName: string;
  private ranges: Range[] = [];
  private highlight: Highlight | null = null;

  constructor(highlightName = DEFAULT_NAME) {
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

    let highlight = highlightsByName.get(name);
    if (!highlight) {
      highlight = new Highlight();
      highlightsByName.set(name, highlight);
      CSS.highlights.set(name, highlight);
    }
    this.highlight = highlight;

    for (const resolved of matches) {
      for (const segment of resolved.segments) {
        try {
          const range = document.createRange();
          range.setStart(segment.node, segment.startOffset);
          range.setEnd(segment.node, segment.endOffset);
          this.ranges.push(range);
          highlight.add(range);
        } catch {
          // Node may have been removed or offsets are stale — skip silently
        }
      }
    }
  }

  clear(): void {
    if (this.highlight) {
      for (const range of this.ranges) {
        this.highlight.delete(range);
      }
    }
    this.ranges = [];
    this.highlight = null;
  }

  destroy(): void {
    const name = this.activeName;
    const highlight = this.highlight;
    this.clear();
    if (name && highlight && highlight.size === 0) {
      highlightsByName.delete(name);
      CSS.highlights.delete(name);
    }
  }
}
