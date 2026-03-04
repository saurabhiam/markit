/**
 * Rendering strategy for highlighting matches.
 *
 * - `'highlight-api'` - CSS Custom Highlight API (zero DOM mutations)
 * - `'dom'` - Range-based DOM wrapping (text node splitting)
 * - `'overlay'` - Positioned overlay elements (framework-safe)
 * - `'auto'` - Feature-detect: prefer highlight-api, fall back to dom
 */
export type RendererType = 'highlight-api' | 'dom' | 'overlay' | 'auto';

/**
 * Accuracy mode for matching.
 *
 * - `'partially'` - Substring match (default)
 * - `'exactly'` - Word-boundary match (\b...\b)
 * - `'startsWith'` - Word-boundary start match (\b...)
 * - `'complementary'` - Whitespace-delimited match
 */
export type AccuracyMode = 'partially' | 'exactly' | 'startsWith' | 'complementary';

/**
 * Effect timing for framework integrations.
 *
 * - `'effect'` - Run after paint (useEffect / default)
 * - `'layout'` - Run before paint (useLayoutEffect)
 */
export type EffectTiming = 'effect' | 'layout';

export interface SynonymMap {
  [key: string]: string | string[];
}

export interface MarkitOptions {
  /** Element tag to wrap matches (DOM renderer only). Default: 'mark' */
  element?: string;

  /** CSS class name(s) applied to highlight wrappers. Default: 'markit-match' */
  className?: string;

  /** Highlight name for CSS Highlight API. Default: 'markit-highlight' */
  highlightName?: string;

  /** Exclude elements matching these selectors from search. */
  exclude?: string[];

  /** Case-sensitive matching. Default: false */
  caseSensitive?: boolean;

  /** Strip diacritics before matching. Default: false */
  ignoreDiacritics?: boolean;

  /** Search across element boundaries. Default: false */
  acrossElements?: boolean;

  /** Split search term into separate words. Default: false */
  separateWordSearch?: boolean;

  /** Accuracy mode for matching. Default: 'partially' */
  accuracy?: AccuracyMode;

  /** Synonym expansion map. */
  synonyms?: SynonymMap;

  /** Wildcard characters enabled. Default: false */
  wildcards?: 'disabled' | 'enabled' | 'withSpaces';

  /** Rendering strategy. Default: 'auto' */
  renderer?: RendererType;

  /** Characters to ignore between match characters (e.g., soft hyphens). */
  ignoreJoiners?: boolean;

  /** Punctuation characters to ignore during matching. */
  ignorePunctuation?: string[];

  /** Enable iframes traversal (same-origin only). Default: false */
  iframes?: boolean;

  /** Timeout for iframe loading in ms. Default: 5000 */
  iframesTimeout?: number;

  /** Debounce delay in ms for live search. Default: 0 (no debounce) */
  debounce?: number;

  /**
   * Batch size for incremental rendering. When set to a positive number and
   * the match count exceeds this value, rendering is split across animation
   * frames to keep the main thread responsive. Default: 0 (synchronous)
   */
  batchSize?: number;

  /** Callback fired for each match found. */
  each?: (element: Element | Range, info: MatchInfo) => void;

  /** Callback fired when all matches are found. */
  done?: (totalMatches: number) => void;

  /** Callback fired when no matches are found. */
  noMatch?: (term: string) => void;

  /** Filter callback — return false to skip a match. */
  filter?: (
    textNode: Text,
    term: string,
    matchIndex: number,
    totalMatches: number,
  ) => boolean;

  /** Debug mode — logs timing and match info to console. */
  debug?: boolean;
}

export interface MatchInfo {
  /** The matched text content. */
  match: string;
  /** The search term or pattern that produced this match. */
  term: string;
  /** Zero-based index of this match in the result set. */
  index: number;
  /** Start offset within the concatenated text. */
  startOffset: number;
  /** End offset within the concatenated text. */
  endOffset: number;
}

export interface MatchResult {
  /** Start offset in the concatenated virtual text string. */
  start: number;
  /** End offset in the concatenated virtual text string. */
  end: number;
  /** The matched text. */
  text: string;
  /** The term/pattern that produced this match. */
  term: string;
}

/**
 * A chunk of text from a single DOM Text node, positioned within the
 * concatenated virtual text string.
 */
export interface TextChunk {
  /** The DOM Text node. */
  node: Text;
  /** Cumulative start offset in the virtual string. */
  start: number;
  /** Cumulative end offset (start + node length). */
  end: number;
  /** The parent element of this text node. */
  parentElement: Element;
}

/**
 * A match resolved to specific DOM text nodes and offsets,
 * ready to be rendered by a renderer engine.
 */
export interface ResolvedMatch {
  /** Segments of the match across potentially multiple text nodes. */
  segments: ResolvedSegment[];
  /** The original match result. */
  match: MatchResult;
}

export interface ResolvedSegment {
  /** The text node containing this segment. */
  node: Text;
  /** Start offset within the text node. */
  startOffset: number;
  /** End offset within the text node. */
  endOffset: number;
}

export interface RendererInterface {
  /** Clear existing highlights and render all matches at once. */
  render(matches: ResolvedMatch[], options: MarkitOptions): void;
  /**
   * Append highlights without clearing existing ones.
   * Used by the batched rendering pipeline — caller is responsible for
   * calling clear() once before the first batch, and for ordering
   * matches appropriately (reverse document order for DOM renderer).
   */
  renderBatch(matches: ResolvedMatch[], options: MarkitOptions): void;
  /** Remove all highlights created by this renderer. */
  clear(): void;
  /** Destroy the renderer and free resources. */
  destroy(): void;
}

export interface MarkitInstance {
  /** Highlight text matching the given term(s). */
  mark(term: string | string[], options?: Partial<MarkitOptions>): void;
  /** Highlight text matching the given regex. */
  markRegExp(regexp: RegExp, options?: Partial<MarkitOptions>): void;
  /** Highlight specific character ranges. */
  markRanges(
    ranges: Array<{ start: number; length: number }>,
    options?: Partial<MarkitOptions>,
  ): void;
  /** Remove all highlights. */
  unmark(options?: Partial<MarkitOptions>): void;
  /** Get current match count. */
  getMatches(): MatchResult[];
  /** Destroy the instance, remove highlights, and free resources. */
  destroy(): void;
}

export interface MarkitPlugin {
  /** Unique plugin name. */
  name: string;
  /** Called before search begins. Can modify the search term. */
  beforeSearch?: (term: string, options: MarkitOptions) => string;
  /** Called after matches are found, before rendering. Can filter/modify matches. */
  afterMatch?: (matches: MatchResult[], options: MarkitOptions) => MatchResult[];
  /** Called before rendering begins. */
  beforeRender?: (matches: ResolvedMatch[], options: MarkitOptions) => void;
  /** Called after rendering completes. */
  afterRender?: (matchCount: number, options: MarkitOptions) => void;
}
