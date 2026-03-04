import type { TextChunk, ResolvedMatch, ResolvedSegment, MatchResult } from '../types.js';

/**
 * Builds a flat index of all text nodes under `root` using TreeWalker,
 * the fastest native DOM traversal API.
 *
 * Each TextChunk maps a Text node to its position in a virtual
 * concatenated string, enabling single-pass regex/string search
 * with O(log n) offset-to-node resolution via binary search.
 */
export function createTextIndex(
  root: Node,
  exclude?: string[],
): TextIndex {
  return new TextIndex(root, exclude);
}

export class TextIndex {
  private chunks: TextChunk[] = [];
  private virtualText = '';
  private root: Node;
  private excludeSelectors: string[];

  constructor(root: Node, exclude?: string[]) {
    this.root = root;
    this.excludeSelectors = exclude ?? [];
    this.rebuild();
  }

  rebuild(): void {
    this.chunks = [];
    this.virtualText = '';
    let offset = 0;

    const walker = document.createTreeWalker(
      this.root,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node: Text) => {
          if (!node.textContent || node.textContent.length === 0) {
            return NodeFilter.FILTER_REJECT;
          }
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;

          if (this.isExcluded(parent)) {
            return NodeFilter.FILTER_REJECT;
          }

          return NodeFilter.FILTER_ACCEPT;
        },
      },
    );

    const textParts: string[] = [];
    let current: Text | null;
    while ((current = walker.nextNode() as Text | null)) {
      const text = current.textContent!;
      const chunk: TextChunk = {
        node: current,
        start: offset,
        end: offset + text.length,
        parentElement: current.parentElement!,
      };
      this.chunks.push(chunk);
      textParts.push(text);
      offset += text.length;
    }

    this.virtualText = textParts.join('');
  }

  getVirtualText(): string {
    return this.virtualText;
  }

  getChunks(): readonly TextChunk[] {
    return this.chunks;
  }

  getChunkCount(): number {
    return this.chunks.length;
  }

  /**
   * Map a match (start/end offsets in the virtual string) to the actual
   * DOM text nodes and their local offsets. A single match can span
   * multiple text nodes when `acrossElements` is enabled.
   */
  resolveMatch(match: MatchResult): ResolvedMatch {
    const segments: ResolvedSegment[] = [];
    const startIdx = this.findChunkIndex(match.start);
    const endIdx = this.findChunkIndex(match.end - 1);

    for (let i = startIdx; i <= endIdx; i++) {
      const chunk = this.chunks[i]!;
      const segStart = Math.max(match.start, chunk.start) - chunk.start;
      const segEnd = Math.min(match.end, chunk.end) - chunk.start;

      segments.push({
        node: chunk.node,
        startOffset: segStart,
        endOffset: segEnd,
      });
    }

    return { segments, match };
  }

  /**
   * Binary search to find the chunk index containing the given
   * virtual text offset. O(log n) where n = number of text nodes.
   */
  private findChunkIndex(offset: number): number {
    let lo = 0;
    let hi = this.chunks.length - 1;

    while (lo <= hi) {
      const mid = (lo + hi) >>> 1;
      const chunk = this.chunks[mid]!;

      if (offset < chunk.start) {
        hi = mid - 1;
      } else if (offset >= chunk.end) {
        lo = mid + 1;
      } else {
        return mid;
      }
    }

    return Math.max(0, lo - 1);
  }

  private isExcluded(element: Element): boolean {
    for (const selector of this.excludeSelectors) {
      if (element.matches(selector) || element.closest(selector)) {
        return true;
      }
    }
    return false;
  }
}
