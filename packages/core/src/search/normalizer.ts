import type { SynonymMap } from '../types.js';

const DIACRITICS_RE = /[\u0300-\u036f]/g;

/**
 * Strip diacritical marks from a string.
 * "café" -> "cafe", "résumé" -> "resume"
 */
export function stripDiacritics(text: string): string {
  return text.normalize('NFD').replace(DIACRITICS_RE, '');
}

/**
 * Escape special regex characters in a string.
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a regex pattern string that incorporates synonym expansion.
 * "color" with synonyms { color: "colour" } => "(color|colour)"
 */
export function expandSynonyms(term: string, synonyms: SynonymMap): string {
  const escaped = escapeRegExp(term);
  const synonymList = synonyms[term.toLowerCase()];

  if (!synonymList) return escaped;

  const alts = Array.isArray(synonymList) ? synonymList : [synonymList];
  const allTerms = [escaped, ...alts.map(escapeRegExp)];
  return `(${allTerms.join('|')})`;
}

/**
 * Build a regex pattern string with optional joiner/punctuation ignorance.
 *
 * When `ignoreJoiners` is true, zero-width characters (soft hyphens,
 * zero-width spaces, etc.) are allowed between each character of the term.
 *
 * When `ignorePunctuation` is provided, those characters are optionally
 * matched between each character.
 */
export function buildJoinerPattern(
  pattern: string,
  ignoreJoiners: boolean,
  ignorePunctuation?: string[],
): string {
  if (!ignoreJoiners && (!ignorePunctuation || ignorePunctuation.length === 0)) {
    return pattern;
  }

  const parts: string[] = [];

  if (ignoreJoiners) {
    // Zero-width non-joiner, zero-width joiner, soft hyphen, zero-width space
    parts.push('[\\u00ad\\u200b\\u200c\\u200d]?');
  }

  if (ignorePunctuation && ignorePunctuation.length > 0) {
    const escaped = ignorePunctuation.map(escapeRegExp).join('');
    parts.push(`[${escaped}]?`);
  }

  if (parts.length === 0) return pattern;

  const joiner = parts.join('');

  // Insert the optional joiner pattern between each character of the search term
  const chars = [...pattern];
  return chars.join(joiner);
}

/**
 * Process wildcards in the search term.
 * '?' matches a single character, '*' matches zero or more characters.
 */
export function processWildcards(
  term: string,
  mode: 'disabled' | 'enabled' | 'withSpaces',
): string {
  if (mode === 'disabled') return escapeRegExp(term);

  const escaped = escapeRegExp(term);
  const singleChar = mode === 'withSpaces' ? '[\\S\\s]' : '\\S';
  const multiChar = mode === 'withSpaces' ? '[\\S\\s]*?' : '\\S*?';

  return escaped.replace(/\\\?/g, singleChar).replace(/\\\*/g, multiChar);
}
