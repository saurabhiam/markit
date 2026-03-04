import type { RendererInterface, ResolvedMatch, MarkitOptions } from '../types.js';

const DATA_ATTR = 'data-markit-id';
let idCounter = 0;

function generateId(): string {
  return `markit-${++idCounter}`;
}

/**
 * DOM-based renderer that wraps matches by splitting text nodes
 * and inserting wrapper elements using the Range API.
 *
 * NEVER uses innerHTML. Only operates on Text nodes via:
 *   1. Range.surroundContents() for simple cases
 *   2. Manual text node splitting for cross-node matches
 *
 * This preserves the parent element structure, Angular bindings,
 * React reconciliation targets, and all event listeners attached
 * to Element nodes.
 */
export class DomRenderer implements RendererInterface {
  private wrapperElements: Element[] = [];

  render(matches: ResolvedMatch[], options: MarkitOptions): void {
    this.clear();

    // Sort in reverse document order to avoid offset invalidation.
    const sorted = [...matches].sort((a, b) => b.match.start - a.match.start);

    this.renderBatch(sorted, options);
  }

  renderBatch(matches: ResolvedMatch[], options: MarkitOptions): void {
    const tag = options.element ?? 'mark';
    const className = options.className ?? 'markit-match';
    const filter = options.filter;

    // Matches must already be in reverse document order when called
    // from the batched pipeline. render() handles sorting itself.
    let matchIndex = matches.length - 1;

    for (const resolved of matches) {
      for (let i = resolved.segments.length - 1; i >= 0; i--) {
        const segment = resolved.segments[i]!;
        const { node, startOffset, endOffset } = segment;

        if (filter) {
          const keep = filter(node, resolved.match.term, matchIndex, matches.length);
          if (!keep) continue;
        }

        try {
          const wrapper = this.wrapTextRange(node, startOffset, endOffset, tag, className);
          if (wrapper) {
            this.wrapperElements.push(wrapper);
          }
        } catch {
          // Node may have been removed or offsets are stale — skip
        }
      }
      matchIndex--;
    }
  }

  clear(): void {
    // Unwrap all wrapper elements: replace with their text content,
    // then normalize parent to merge adjacent text nodes.
    const parents = new Set<Node>();

    for (const wrapper of this.wrapperElements) {
      const parent = wrapper.parentNode;
      if (!parent) continue;

      parents.add(parent);

      // Replace wrapper with its child text nodes
      while (wrapper.firstChild) {
        parent.insertBefore(wrapper.firstChild, wrapper);
      }
      parent.removeChild(wrapper);
    }

    // Merge adjacent text nodes that were split during highlighting
    for (const parent of parents) {
      parent.normalize();
    }

    this.wrapperElements = [];
  }

  destroy(): void {
    this.clear();
  }

  /**
   * Wrap a range within a single text node. Uses Range API to split
   * the text node at the boundaries and surround the middle part.
   */
  private wrapTextRange(
    textNode: Text,
    startOffset: number,
    endOffset: number,
    tag: string,
    className: string,
  ): Element | null {
    if (startOffset >= endOffset) return null;
    if (!textNode.parentNode) return null;

    const range = document.createRange();
    range.setStart(textNode, startOffset);
    range.setEnd(textNode, endOffset);

    const wrapper = document.createElement(tag);
    wrapper.className = className;
    wrapper.setAttribute(DATA_ATTR, generateId());

    try {
      range.surroundContents(wrapper);
    } catch {
      // surroundContents fails if the range crosses element boundaries.
      // For single-segment matches within one text node, this won't happen.
      // If it does, fall back to manual splitting.
      return this.manualWrap(textNode, startOffset, endOffset, wrapper);
    }

    return wrapper;
  }

  /**
   * Manual text node split + wrap fallback.
   * Splits the text node into [before, match, after] and wraps the match.
   */
  private manualWrap(
    textNode: Text,
    startOffset: number,
    endOffset: number,
    wrapper: Element,
  ): Element | null {
    const parent = textNode.parentNode;
    if (!parent) return null;

    const fullText = textNode.textContent ?? '';
    const beforeText = fullText.slice(0, startOffset);
    const matchText = fullText.slice(startOffset, endOffset);
    const afterText = fullText.slice(endOffset);

    const matchTextNode = document.createTextNode(matchText);
    wrapper.appendChild(matchTextNode);

    if (afterText) {
      const afterNode = document.createTextNode(afterText);
      parent.insertBefore(afterNode, textNode.nextSibling);
    }

    parent.insertBefore(wrapper, textNode.nextSibling);

    if (beforeText) {
      textNode.textContent = beforeText;
    } else {
      parent.removeChild(textNode);
    }

    return wrapper;
  }
}
