import { describe, it, expect } from 'vitest';
import { createMatcher } from '../src/search/matcher.js';

describe('KeywordMatcher', () => {
  it('finds simple keyword matches', () => {
    const matcher = createMatcher('hello', {});
    const results = matcher.findMatches('hello world hello');
    expect(results).toHaveLength(2);
    expect(results[0]!.text).toBe('hello');
    expect(results[0]!.start).toBe(0);
    expect(results[0]!.end).toBe(5);
    expect(results[1]!.start).toBe(12);
  });

  it('finds case-insensitive matches by default', () => {
    const matcher = createMatcher('Hello', {});
    const results = matcher.findMatches('hello HELLO Hello');
    expect(results).toHaveLength(3);
  });

  it('respects case-sensitive option', () => {
    const matcher = createMatcher('Hello', { caseSensitive: true });
    const results = matcher.findMatches('hello HELLO Hello');
    expect(results).toHaveLength(1);
    expect(results[0]!.text).toBe('Hello');
  });

  it('finds multiple keywords', () => {
    const matcher = createMatcher(['foo', 'bar'], {});
    const results = matcher.findMatches('foo and bar and foo');
    expect(results).toHaveLength(3);
  });

  it('handles empty term gracefully', () => {
    const matcher = createMatcher('', {});
    const results = matcher.findMatches('hello world');
    expect(results).toHaveLength(0);
  });

  it('handles empty text gracefully', () => {
    const matcher = createMatcher('hello', {});
    const results = matcher.findMatches('');
    expect(results).toHaveLength(0);
  });

  describe('accuracy modes', () => {
    it('partially matches substrings (default)', () => {
      const matcher = createMatcher('ell', { accuracy: 'partially' });
      const results = matcher.findMatches('hello bell');
      expect(results).toHaveLength(2);
    });

    it('exactly matches whole words', () => {
      const matcher = createMatcher('hell', { accuracy: 'exactly' });
      const results = matcher.findMatches('hello hell shell');
      expect(results).toHaveLength(1);
      expect(results[0]!.text).toBe('hell');
    });

    it('startsWith matches word beginnings', () => {
      const matcher = createMatcher('hel', { accuracy: 'startsWith' });
      const results = matcher.findMatches('hello help shell');
      expect(results).toHaveLength(2);
    });
  });

  describe('diacritics', () => {
    it('matches with diacritics stripped when ignoreDiacritics is true', () => {
      const matcher = createMatcher('cafe', { ignoreDiacritics: true });
      const results = matcher.findMatches('café is great');
      expect(results).toHaveLength(1);
      expect(results[0]!.text).toBe('café');
    });

    it('does not match diacritics when ignoreDiacritics is false', () => {
      const matcher = createMatcher('cafe', { ignoreDiacritics: false });
      const results = matcher.findMatches('café is great');
      expect(results).toHaveLength(0);
    });
  });

  describe('separateWordSearch', () => {
    it('splits search term into individual words', () => {
      const matcher = createMatcher('hello world', { separateWordSearch: true });
      const results = matcher.findMatches('hello beautiful world');
      expect(results).toHaveLength(2);
    });

    it('searches as a phrase when separateWordSearch is false', () => {
      const matcher = createMatcher('hello world', { separateWordSearch: false });
      const results = matcher.findMatches('hello beautiful world');
      expect(results).toHaveLength(0);
    });
  });

  describe('synonyms', () => {
    it('matches synonym terms', () => {
      const matcher = createMatcher('color', {
        synonyms: { color: 'colour' },
      });
      const results = matcher.findMatches('colour and color');
      expect(results).toHaveLength(2);
    });
  });

  describe('wildcards', () => {
    it('matches with single character wildcard', () => {
      const matcher = createMatcher('h?llo', { wildcards: 'enabled' });
      const results = matcher.findMatches('hello hallo hullo');
      expect(results).toHaveLength(3);
    });

    it('matches with multi-character wildcard', () => {
      const matcher = createMatcher('h*o', { wildcards: 'enabled' });
      const results = matcher.findMatches('hello hippo');
      expect(results).toHaveLength(2);
    });
  });
});

describe('RegExpMatcher', () => {
  it('finds regex matches', () => {
    const matcher = createMatcher(/\d+/, {});
    const results = matcher.findMatches('foo 123 bar 456');
    expect(results).toHaveLength(2);
    expect(results[0]!.text).toBe('123');
    expect(results[1]!.text).toBe('456');
  });

  it('handles global flag correctly', () => {
    const matcher = createMatcher(/\w+/g, {});
    const results = matcher.findMatches('hello world');
    expect(results).toHaveLength(2);
  });

  it('handles capturing groups', () => {
    const matcher = createMatcher(/(foo|bar)/g, {});
    const results = matcher.findMatches('foo baz bar');
    expect(results).toHaveLength(2);
  });

  it('does not loop infinitely on zero-length matches', () => {
    const matcher = createMatcher(/(?=\s)/g, {});
    const results = matcher.findMatches('a b c');
    // Should not hang — zero-length matches advance the index
    expect(results).toBeDefined();
  });
});
