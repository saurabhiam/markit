import { describe, it, expect } from 'vitest';
import {
  stripDiacritics,
  escapeRegExp,
  expandSynonyms,
  buildJoinerPattern,
  processWildcards,
} from '../src/search/normalizer.js';

describe('stripDiacritics', () => {
  it('removes diacritical marks from accented characters', () => {
    expect(stripDiacritics('café')).toBe('cafe');
    expect(stripDiacritics('résumé')).toBe('resume');
    expect(stripDiacritics('naïve')).toBe('naive');
    expect(stripDiacritics('über')).toBe('uber');
  });

  it('leaves ASCII text unchanged', () => {
    expect(stripDiacritics('hello world')).toBe('hello world');
  });

  it('handles empty string', () => {
    expect(stripDiacritics('')).toBe('');
  });

  it('handles mixed diacritics and ASCII', () => {
    expect(stripDiacritics('El Niño effect')).toBe('El Nino effect');
  });

  it('handles combining characters', () => {
    // é can be represented as e + combining acute accent
    expect(stripDiacritics('e\u0301')).toBe('e');
  });
});

describe('escapeRegExp', () => {
  it('escapes special regex characters', () => {
    expect(escapeRegExp('hello.world')).toBe('hello\\.world');
    expect(escapeRegExp('foo[bar]')).toBe('foo\\[bar\\]');
    expect(escapeRegExp('a*b+c?')).toBe('a\\*b\\+c\\?');
    expect(escapeRegExp('(test)')).toBe('\\(test\\)');
    expect(escapeRegExp('$100')).toBe('\\$100');
  });

  it('leaves normal text unchanged', () => {
    expect(escapeRegExp('hello')).toBe('hello');
  });
});

describe('expandSynonyms', () => {
  it('expands a single synonym', () => {
    const synonyms = { color: 'colour' };
    const pattern = expandSynonyms('color', synonyms);
    expect(pattern).toBe('(color|colour)');
  });

  it('expands multiple synonyms', () => {
    const synonyms = { color: ['colour', 'couleur'] };
    const pattern = expandSynonyms('color', synonyms);
    expect(pattern).toBe('(color|colour|couleur)');
  });

  it('returns escaped term when no synonym exists', () => {
    const synonyms = { color: 'colour' };
    const pattern = expandSynonyms('hello', synonyms);
    expect(pattern).toBe('hello');
  });

  it('handles case-insensitive synonym lookup', () => {
    const synonyms = { color: 'colour' };
    const pattern = expandSynonyms('Color', synonyms);
    expect(pattern).toBe('(Color|colour)');
  });
});

describe('buildJoinerPattern', () => {
  it('returns pattern unchanged when no joiners/punctuation', () => {
    expect(buildJoinerPattern('hello', false)).toBe('hello');
    expect(buildJoinerPattern('hello', false, [])).toBe('hello');
  });

  it('inserts joiner pattern between characters when ignoreJoiners is true', () => {
    const result = buildJoinerPattern('ab', true);
    expect(result).toContain('\\u00ad');
    expect(result).toContain('\\u200b');
  });

  it('inserts punctuation pattern when ignorePunctuation is provided', () => {
    const result = buildJoinerPattern('ab', false, ['-', '.']);
    expect(result).toContain('[');
    expect(result).toContain(']?');
  });
});

describe('processWildcards', () => {
  it('returns escaped string when wildcards disabled', () => {
    expect(processWildcards('hello*world', 'disabled')).toBe('hello\\*world');
  });

  it('converts ? to non-space character matcher when enabled', () => {
    const result = processWildcards('h?llo', 'enabled');
    expect(result).toContain('\\S');
  });

  it('converts * to non-space sequence matcher when enabled', () => {
    const result = processWildcards('h*o', 'enabled');
    expect(result).toContain('\\S*?');
  });

  it('converts ? to any character matcher with withSpaces', () => {
    const result = processWildcards('h?llo', 'withSpaces');
    expect(result).toContain('[\\S\\s]');
  });
});
