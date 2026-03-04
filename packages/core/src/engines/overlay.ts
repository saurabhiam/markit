import type { RendererInterface, ResolvedMatch, MarkitOptions } from '../types.js';

/**
 * Overlay-based renderer that positions absolutely-positioned elements
 * over matched text using Range.getBoundingClientRect().
 *
 * This renderer is completely decoupled from the DOM tree that
 * frameworks manage. It creates its own container element and
 * positions highlight overlays using coordinates.
 *
 * Trade-offs:
 * - Zero conflict with any framework's DOM management
 * - Requires repositioning on scroll/resize (handled automatically)
 * - Slightly higher memory usage (one element per match segment)
 */
export class OverlayRenderer implements RendererInterface {
  private container: HTMLElement | null = null;
  private overlays: HTMLElement[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private scrollHandler: (() => void) | null = null;
  private rootElement: Element;
  private lastMatches: ResolvedMatch[] = [];
  private lastOptions: MarkitOptions = {};

  constructor(rootElement: Element) {
    this.rootElement = rootElement;
  }

  render(matches: ResolvedMatch[], options: MarkitOptions): void {
    this.clear();
    this.lastMatches = matches;
    this.lastOptions = options;

    if (matches.length === 0) return;

    this.ensureContainer();
    this.positionOverlays(matches, options);
    this.setupRepositioning();
  }

  renderBatch(matches: ResolvedMatch[], options: MarkitOptions): void {
    this.lastMatches = this.lastMatches.concat(matches);
    this.lastOptions = options;

    if (matches.length === 0) return;

    this.ensureContainer();
    this.positionOverlays(matches, options);
  }

  clear(): void {
    this.teardownRepositioning();

    for (const overlay of this.overlays) {
      overlay.remove();
    }
    this.overlays = [];

    if (this.container) {
      this.container.remove();
      this.container = null;
    }

    this.lastMatches = [];
  }

  destroy(): void {
    this.clear();
  }

  private ensureContainer(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.style.position = 'absolute';
    this.container.style.top = '0';
    this.container.style.left = '0';
    this.container.style.pointerEvents = 'none';
    this.container.style.zIndex = '9999';
    this.container.setAttribute('data-markit-overlay', 'true');
    this.container.setAttribute('aria-hidden', 'true');

    const parent = this.rootElement.parentElement ?? document.body;
    const parentPosition = getComputedStyle(parent).position;
    if (parentPosition === 'static') {
      parent.style.position = 'relative';
    }
    parent.appendChild(this.container);
  }

  private positionOverlays(matches: ResolvedMatch[], options: MarkitOptions): void {
    if (!this.container) return;

    const className = options.className ?? 'markit-overlay';
    const parentRect = this.container.parentElement!.getBoundingClientRect();

    for (const resolved of matches) {
      for (const segment of resolved.segments) {
        try {
          const range = document.createRange();
          range.setStart(segment.node, segment.startOffset);
          range.setEnd(segment.node, segment.endOffset);

          const rects = range.getClientRects();

          for (const rect of rects) {
            const overlay = document.createElement('div');
            overlay.className = className;
            overlay.style.position = 'absolute';
            overlay.style.top = `${rect.top - parentRect.top}px`;
            overlay.style.left = `${rect.left - parentRect.left}px`;
            overlay.style.width = `${rect.width}px`;
            overlay.style.height = `${rect.height}px`;
            overlay.style.backgroundColor = 'rgba(255, 255, 0, 0.3)';
            overlay.style.pointerEvents = 'none';
            overlay.style.mixBlendMode = 'multiply';

            this.container.appendChild(overlay);
            this.overlays.push(overlay);
          }
        } catch {
          // Node removed or offsets stale — skip
        }
      }
    }
  }

  private setupRepositioning(): void {
    const reposition = () => {
      if (this.lastMatches.length > 0) {
        for (const overlay of this.overlays) {
          overlay.remove();
        }
        this.overlays = [];
        this.positionOverlays(this.lastMatches, this.lastOptions);
      }
    };

    this.scrollHandler = reposition;
    window.addEventListener('scroll', reposition, { passive: true });
    window.addEventListener('resize', reposition, { passive: true });

    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(reposition);
      this.resizeObserver.observe(this.rootElement);
    }
  }

  private teardownRepositioning(): void {
    if (this.scrollHandler) {
      window.removeEventListener('scroll', this.scrollHandler);
      window.removeEventListener('resize', this.scrollHandler);
      this.scrollHandler = null;
    }
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
  }
}
