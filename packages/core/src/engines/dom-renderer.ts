import type { RendererInterface, ResolvedMatch, MarkitOptions } from '../types.js';

const DATA_ATTR = 'data-markit-id';
/** Set only on start-of-node wrappers so clear() merges into the preserved node (avoids doing the merge for every wrapper). */
const MERGE_NEXT_ATTR = 'data-markit-merge-next';
let idCounter = 0;

function generateId(): string {
  return `markit-${++idCounter}`;
}

/**
 * DOM-based renderer that wraps matches by splitting text nodes
 * and inserting wrapper elements.
 *
 * NEVER uses innerHTML. Only operates on Text nodes by splitting
 * into [before, match, after] and inserting a wrapper around the
 * match. The original text node is never removed—only its
 * textContent is updated—so framework bindings (Angular, React, etc.)
 * continue to update the same node.
 *
 * Multiple matches in the same node are processed in reverse document
 * order. Overlapping start-of-node matches (e.g. "H" and "Hello") on the
 * same node: the first wrap wins; later segments are skipped if the node
 * was already shortened (stale-segment guard).
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
    const parentsThatNeedNormalize = new Set<Node>();

    for (const wrapper of this.wrapperElements) {
      const parent = wrapper.parentNode;
      if (!parent) continue;

      // wrapTextRange creates a single text node, which we unwrap here.
      const matchTextNode = wrapper.firstChild!;
      parent.insertBefore(matchTextNode, wrapper);

      let merged = false;
      if (wrapper.hasAttribute(MERGE_NEXT_ATTR)) {
        const preservedNode = wrapper.nextSibling;
        if (
          matchTextNode?.nodeType === Node.TEXT_NODE &&
          preservedNode?.nodeType === Node.TEXT_NODE
        ) {
          const text = (matchTextNode as Text).data;
          (preservedNode as Text).insertData(0, text);
          parent.removeChild(matchTextNode);
          merged = true;
        }
      }
      if (!merged) {
        parentsThatNeedNormalize.add(parent);
      }

      parent.removeChild(wrapper);
    }

    // Merge adjacent text nodes that were split during highlighting
    for (const parent of parentsThatNeedNormalize) {
      parent.normalize();
    }

    this.wrapperElements = [];
  }

  destroy(): void {
    this.clear();
  }

  /**
   * Wrap a range within a single text node. Single strategy: split into
   * [before, match, after], wrap the match, and never remove the original
   * text node—only update its textContent. This keeps framework-owned
   * nodes in the DOM whether the match is at the start or in the middle.
   * Returns null if the segment is stale (node was already shortened by a prior wrap).
   */
  private wrapTextRange(
    textNode: Text,
    startOffset: number,
    endOffset: number,
    tag: string,
    className: string,
  ): Element | null {
    if (startOffset >= endOffset) return null;
    const parent = textNode.parentNode;
    if (!parent) return null;

    const fullText = textNode.textContent ?? '';
    // If the segment is stale (node was already shortened by a prior wrap), return null.
    if (fullText.length < endOffset) return null;

    const beforeText = fullText.slice(0, startOffset);
    const matchText = fullText.slice(startOffset, endOffset);
    const afterText = fullText.slice(endOffset);

    const wrapper = document.createElement(tag);
    wrapper.className = className;
    wrapper.setAttribute(DATA_ATTR, generateId());
    wrapper.appendChild(document.createTextNode(matchText));

    if (beforeText) {
      // Match in the middle (or end): keep node with "before", insert wrapper, then "after".
      textNode.textContent = beforeText;
      parent.insertBefore(wrapper, textNode.nextSibling);
      if (afterText) {
        parent.insertBefore(document.createTextNode(afterText), wrapper.nextSibling);
      }
    } else {
      // Match at the start: insert wrapper before node, keep node with "after".
      wrapper.setAttribute(MERGE_NEXT_ATTR, '1');
      parent.insertBefore(wrapper, textNode);
      textNode.textContent = afterText;
    }

    return wrapper;
  }
}
