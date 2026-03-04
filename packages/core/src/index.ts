export { markit } from './markit.js';
export { createTextIndex } from './search/text-index.js';
export { createMatcher } from './search/matcher.js';
export { HighlightApiRenderer } from './engines/highlight-api.js';
export { DomRenderer } from './engines/dom-renderer.js';
export { OverlayRenderer } from './engines/overlay.js';

export type {
  MarkitOptions,
  MarkitInstance,
  MarkitPlugin,
  MatchResult,
  MatchInfo,
  ResolvedMatch,
  ResolvedSegment,
  TextChunk,
  RendererInterface,
  RendererType,
  AccuracyMode,
  SynonymMap,
  EffectTiming,
} from './types.js';
