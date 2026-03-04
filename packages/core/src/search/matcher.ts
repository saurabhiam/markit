import type { AccuracyMode, MarkitOptions, MatchResult } from '../types.js';
import {
  escapeRegExp,
  expandSynonyms,
  stripDiacritics,
  buildJoinerPattern,
  processWildcards,
} from './normalizer.js';

export interface Matcher {
  /** Find all matches in the given text. */
  findMatches(text: string): MatchResult[];
}

/**
 * Create a Matcher from the given search term(s) and options.
 * Compiles search terms into an optimized regex once, then
 * reuses it across multiple calls to findMatches().
 */
export function createMatcher(
  term: string | string[] | RegExp,
  options: MarkitOptions = {},
): Matcher {
  if (term instanceof RegExp) {
    return new RegExpMatcher(term, options);
  }

  const terms = Array.isArray(term) ? term : [term];
  return new KeywordMatcher(terms, options);
}

class RegExpMatcher implements Matcher {
  private regex: RegExp;
  private options: MarkitOptions;

  constructor(regex: RegExp, options: MarkitOptions) {
    this.options = options;
    // Ensure global flag is set for findMatches iteration
    const flags = regex.flags.includes('g') ? regex.flags : regex.flags + 'g';
    this.regex = new RegExp(regex.source, flags);
  }

  findMatches(text: string): MatchResult[] {
    const results: MatchResult[] = [];
    const searchText = this.options.ignoreDiacritics ? stripDiacritics(text) : text;

    this.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = this.regex.exec(searchText)) !== null) {
      if (match[0].length === 0) {
        this.regex.lastIndex++;
        continue;
      }
      results.push({
        start: match.index,
        end: match.index + match[0].length,
        text: text.slice(match.index, match.index + match[0].length),
        term: this.regex.source,
      });
    }

    return results;
  }
}

class KeywordMatcher implements Matcher {
  private regex: RegExp;
  private terms: string[];
  private options: MarkitOptions;

  constructor(terms: string[], options: MarkitOptions) {
    this.terms = terms.filter((t) => t.length > 0);
    this.options = options;
    this.regex = this.compile();
  }

  findMatches(text: string): MatchResult[] {
    const results: MatchResult[] = [];
    const searchText = this.options.ignoreDiacritics ? stripDiacritics(text) : text;

    this.regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = this.regex.exec(searchText)) !== null) {
      if (match[0].length === 0) {
        this.regex.lastIndex++;
        continue;
      }
      const term = this.identifyTerm(match);
      results.push({
        start: match.index,
        end: match.index + match[0].length,
        text: text.slice(match.index, match.index + match[0].length),
        term,
      });
    }

    return results;
  }

  private compile(): RegExp {
    const {
      caseSensitive = false,
      accuracy = 'partially',
      synonyms,
      wildcards = 'disabled',
      ignoreJoiners = false,
      ignorePunctuation,
      separateWordSearch = false,
      ignoreDiacritics = false,
    } = this.options;

    let allTerms = [...this.terms];

    if (separateWordSearch) {
      allTerms = allTerms.flatMap((t) => t.split(/\s+/).filter(Boolean));
    }

    const patterns = allTerms.map((term) => {
      let processed = ignoreDiacritics ? stripDiacritics(term) : term;

      let pattern: string;
      if (synonyms && synonyms[processed.toLowerCase()]) {
        pattern = expandSynonyms(processed, synonyms);
      } else if (wildcards !== 'disabled') {
        pattern = processWildcards(processed, wildcards);
      } else {
        pattern = escapeRegExp(processed);
      }

      pattern = buildJoinerPattern(pattern, ignoreJoiners, ignorePunctuation);
      pattern = wrapAccuracy(pattern, accuracy);

      return pattern;
    });

    const combined = patterns.join('|');
    const flags = caseSensitive ? 'gm' : 'gim';

    return new RegExp(combined, flags);
  }

  /**
   * Identify which search term produced this match by checking
   * which capturing group matched.
   */
  private identifyTerm(match: RegExpExecArray): string {
    return match[0];
  }
}

function wrapAccuracy(pattern: string, accuracy: AccuracyMode): string {
  switch (accuracy) {
    case 'exactly':
      return `\\b(${pattern})\\b`;
    case 'startsWith':
      return `\\b(${pattern})`;
    case 'complementary':
      return `(?:^|\\s)(${pattern})(?:$|\\s)`;
    case 'partially':
    default:
      return `(${pattern})`;
  }
}
