import type {
  MarkitInstance,
  MarkitOptions,
  MarkitPlugin,
  MatchResult,
  RendererInterface,
  ResolvedMatch,
} from './types.js';
import { TextIndex } from './search/text-index.js';
import { createMatcher } from './search/matcher.js';
import { HighlightApiRenderer, isHighlightApiSupported } from './engines/highlight-api.js';
import { DomRenderer } from './engines/dom-renderer.js';
import { OverlayRenderer } from './engines/overlay.js';
import { DomObserver } from './utils/dom-observer.js';
import { PluginBus } from './plugins/plugin-bus.js';
import { debounce, scheduleBatched } from './utils/scheduler.js';

const isServer = typeof window === 'undefined' || typeof document === 'undefined';

const DEFAULT_OPTIONS: MarkitOptions = {
  element: 'mark',
  className: 'markit-match',
  highlightName: 'markit-highlight',
  caseSensitive: false,
  ignoreDiacritics: false,
  acrossElements: false,
  separateWordSearch: false,
  accuracy: 'partially',
  wildcards: 'disabled',
  ignoreJoiners: false,
  renderer: 'auto',
  iframes: false,
  iframesTimeout: 5000,
  debounce: 0,
  batchSize: 0,
  debug: false,
};

/**
 * Create a MarkIt instance bound to a root DOM element.
 *
 * The instance manages the lifecycle of text indexing, searching,
 * and rendering. It is safe to call mark() multiple times — each
 * call clears previous highlights before applying new ones.
 */
export function markit(root: HTMLElement, plugins?: MarkitPlugin[]): MarkitInstance {
  if (isServer) {
    return createNoopInstance();
  }
  return new MarkitCore(root, plugins);
}

class MarkitCore implements MarkitInstance {
  private root: HTMLElement;
  private textIndex: TextIndex | null = null;
  private renderer: RendererInterface | null = null;
  private domObserver: DomObserver;
  private pluginBus: PluginBus;
  private currentMatches: MatchResult[] = [];
  private debouncedMark: { call: (...args: unknown[]) => void; cancel: () => void } | null = null;
  private cancelBatch: (() => void) | null = null;
  private indexDirty = true;

  constructor(root: HTMLElement, plugins?: MarkitPlugin[]) {
    this.root = root;
    this.pluginBus = new PluginBus();
    this.domObserver = new DomObserver(() => {
      this.indexDirty = true;
    });

    if (plugins) {
      for (const plugin of plugins) {
        this.pluginBus.register(plugin);
      }
    }

    this.domObserver.observe(root);
  }

  mark(term: string | string[], options?: Partial<MarkitOptions>): void {
    const opts = this.mergeOptions(options);

    if (opts.debounce && opts.debounce > 0) {
      if (!this.debouncedMark) {
        this.debouncedMark = debounce(
          (...args: unknown[]) =>
            this.executeMarkKeyword(args[0] as string | string[], args[1] as MarkitOptions),
          opts.debounce,
        );
      }
      this.debouncedMark.call(term, opts);
      return;
    }

    this.executeMarkKeyword(term, opts);
  }

  markRegExp(regexp: RegExp, options?: Partial<MarkitOptions>): void {
    const opts = this.mergeOptions(options);
    this.executeMarkRegExp(regexp, opts);
  }

  markRanges(
    ranges: Array<{ start: number; length: number }>,
    options?: Partial<MarkitOptions>,
  ): void {
    const opts = this.mergeOptions(options);
    this.ensureIndex(opts);
    const renderer = this.getRenderer(opts);

    const matchResults: MatchResult[] = ranges.map((r) => ({
      start: r.start,
      end: r.start + r.length,
      text: this.textIndex!.getVirtualText().slice(r.start, r.start + r.length),
      term: '',
    }));

    this.currentMatches = this.pluginBus.afterMatch(matchResults, opts);
    const resolved = this.resolveMatches(this.currentMatches);

    this.pluginBus.beforeRender(resolved, opts);
    renderer.render(resolved, opts);
    this.pluginBus.afterRender(this.currentMatches.length, opts);

    this.fireCallbacks(opts);
  }

  unmark(options?: Partial<MarkitOptions>): void {
    this.cancelPendingBatch();
    if (this.renderer) {
      this.renderer.clear();
    }
    this.currentMatches = [];
  }

  getMatches(): MatchResult[] {
    return [...this.currentMatches];
  }

  destroy(): void {
    this.cancelPendingBatch();
    this.debouncedMark?.cancel();
    this.domObserver.disconnect();
    if (this.renderer) {
      this.renderer.destroy();
      this.renderer = null;
    }
    this.textIndex = null;
    this.currentMatches = [];
  }

  private executeMarkKeyword(term: string | string[], opts: MarkitOptions): void {
    this.cancelPendingBatch();

    // Clear previous highlights — this mutates the DOM (for DOM renderer),
    // so we must mark the index dirty immediately (MutationObserver is async).
    if (this.renderer) {
      this.renderer.clear();
      this.indexDirty = true;
    }

    this.ensureIndex(opts);

    let processedTerm = term;
    if (typeof processedTerm === 'string') {
      processedTerm = this.pluginBus.beforeSearch(processedTerm, opts);
    } else {
      processedTerm = processedTerm.map((t) => this.pluginBus.beforeSearch(t, opts));
    }

    const matcher = createMatcher(processedTerm, opts);
    const virtualText = this.textIndex!.getVirtualText();

    if (opts.debug) {
      console.time('[markit] search');
    }

    let matches = matcher.findMatches(virtualText);

    if (opts.debug) {
      console.timeEnd('[markit] search');
      console.log(`[markit] found ${matches.length} matches`);
    }

    this.currentMatches = this.pluginBus.afterMatch(matches, opts);
    const resolved = this.resolveMatches(this.currentMatches);

    this.renderResolved(resolved, opts);
  }

  private executeMarkRegExp(regexp: RegExp, opts: MarkitOptions): void {
    this.cancelPendingBatch();

    if (this.renderer) {
      this.renderer.clear();
      this.indexDirty = true;
    }

    this.ensureIndex(opts);
    const matcher = createMatcher(regexp, opts);
    const virtualText = this.textIndex!.getVirtualText();
    let matches = matcher.findMatches(virtualText);

    this.currentMatches = this.pluginBus.afterMatch(matches, opts);
    const resolved = this.resolveMatches(this.currentMatches);

    this.renderResolved(resolved, opts);
  }

  /**
   * Render resolved matches — synchronously when batchSize is 0 or when
   * the match count fits in a single batch, otherwise via scheduleBatched
   * to yield to the main thread between batches.
   */
  private renderResolved(resolved: ResolvedMatch[], opts: MarkitOptions): void {
    const renderer = this.getRenderer(opts);
    const batchSize = opts.batchSize ?? 0;
    const useBatching = batchSize > 0 && resolved.length > batchSize;

    this.pluginBus.beforeRender(resolved, opts);

    if (!useBatching) {
      if (opts.debug) console.time('[markit] render');

      renderer.render(resolved, opts);

      if (opts.debug) console.timeEnd('[markit] render');

      this.pluginBus.afterRender(this.currentMatches.length, opts);
      this.fireCallbacks(opts);
      return;
    }

    // Batched path: pre-sort in reverse document order for DOM safety,
    // then yield between batches via requestIdleCallback / rAF.
    if (opts.debug) console.time('[markit] render (batched)');

    const sorted = [...resolved].sort((a, b) => b.match.start - a.match.start);

    // Clear happened in the caller. Now render incrementally.
    renderer.clear();

    this.cancelBatch = scheduleBatched(
      sorted,
      (batch) => {
        renderer.renderBatch(batch, opts);
      },
      batchSize,
      () => {
        this.cancelBatch = null;

        if (opts.debug) console.timeEnd('[markit] render (batched)');

        this.pluginBus.afterRender(this.currentMatches.length, opts);
        this.fireCallbacks(opts);
      },
    );
  }

  private cancelPendingBatch(): void {
    if (this.cancelBatch) {
      this.cancelBatch();
      this.cancelBatch = null;
    }
  }

  private ensureIndex(opts: MarkitOptions): void {
    if (!this.textIndex || this.indexDirty) {
      this.textIndex = new TextIndex(this.root, opts.exclude);
      this.indexDirty = false;
    }
  }

  private resolveMatches(matches: MatchResult[]): ResolvedMatch[] {
    if (!this.textIndex) return [];
    return matches.map((m) => this.textIndex!.resolveMatch(m));
  }

  private getRenderer(opts: MarkitOptions): RendererInterface {
    const type = opts.renderer ?? 'auto';

    // Reuse existing renderer if same type
    if (this.renderer) {
      const isCorrectType =
        (type === 'highlight-api' && this.renderer instanceof HighlightApiRenderer) ||
        (type === 'dom' && this.renderer instanceof DomRenderer) ||
        (type === 'overlay' && this.renderer instanceof OverlayRenderer);
      if (isCorrectType) return this.renderer;

      // Wrong type — destroy old one
      this.renderer.destroy();
    }

    switch (type) {
      case 'highlight-api':
        this.renderer = new HighlightApiRenderer(opts.highlightName);
        break;
      case 'dom':
        this.renderer = new DomRenderer();
        break;
      case 'overlay':
        this.renderer = new OverlayRenderer(this.root);
        break;
      case 'auto':
      default:
        if (isHighlightApiSupported()) {
          this.renderer = new HighlightApiRenderer(opts.highlightName);
        } else {
          this.renderer = new DomRenderer();
        }
        break;
    }

    return this.renderer;
  }

  private mergeOptions(partial?: Partial<MarkitOptions>): MarkitOptions {
    return { ...DEFAULT_OPTIONS, ...partial };
  }

  private fireCallbacks(opts: MarkitOptions): void {
    if (this.currentMatches.length === 0 && opts.noMatch) {
      opts.noMatch('');
    }

    if (opts.each) {
      for (let i = 0; i < this.currentMatches.length; i++) {
        const match = this.currentMatches[i]!;
        opts.each(this.root, {
          match: match.text,
          term: match.term,
          index: i,
          startOffset: match.start,
          endOffset: match.end,
        });
      }
    }

    if (opts.done) {
      opts.done(this.currentMatches.length);
    }
  }
}

/**
 * No-op instance returned during SSR.
 * All methods are safe to call but do nothing.
 */
function createNoopInstance(): MarkitInstance {
  return {
    mark: () => {},
    markRegExp: () => {},
    markRanges: () => {},
    unmark: () => {},
    getMatches: () => [],
    destroy: () => {},
  };
}
