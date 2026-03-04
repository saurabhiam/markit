import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markit } from '../src/markit.js';

describe('markit instance', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    return () => {
      document.body.removeChild(container);
    };
  });

  it('creates an instance and highlights text (DOM renderer)', () => {
    container.innerHTML = '<p>hello world</p>';
    const instance = markit(container);
    instance.mark('hello', { renderer: 'dom' });

    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('mark')!.textContent).toBe('hello');

    instance.destroy();
  });

  it('unmark removes all highlights', () => {
    container.innerHTML = '<p>hello world hello</p>';
    const instance = markit(container);
    instance.mark('hello', { renderer: 'dom' });

    expect(container.querySelectorAll('mark')).toHaveLength(2);

    instance.unmark();
    expect(container.querySelectorAll('mark')).toHaveLength(0);

    instance.destroy();
  });

  it('getMatches returns current match results', () => {
    container.innerHTML = '<p>foo bar foo baz foo</p>';
    const instance = markit(container);
    instance.mark('foo', { renderer: 'dom' });

    const matches = instance.getMatches();
    expect(matches).toHaveLength(3);
    expect(matches[0]!.text).toBe('foo');

    instance.destroy();
  });

  it('calls done callback with match count', () => {
    container.innerHTML = '<p>test test test</p>';
    const done = vi.fn();
    const instance = markit(container);
    instance.mark('test', { renderer: 'dom', done });

    expect(done).toHaveBeenCalledWith(3);

    instance.destroy();
  });

  it('calls noMatch callback when no matches found', () => {
    container.innerHTML = '<p>hello world</p>';
    const noMatch = vi.fn();
    const instance = markit(container);
    instance.mark('xyz', { renderer: 'dom', noMatch });

    expect(noMatch).toHaveBeenCalled();

    instance.destroy();
  });

  it('calls each callback for every match', () => {
    container.innerHTML = '<p>foo bar foo</p>';
    const each = vi.fn();
    const instance = markit(container);
    instance.mark('foo', { renderer: 'dom', each });

    expect(each).toHaveBeenCalledTimes(2);

    instance.destroy();
  });

  it('handles multiple mark() calls (clears previous)', () => {
    container.innerHTML = '<p>hello world</p>';
    const instance = markit(container);
    instance.mark('hello', { renderer: 'dom' });
    expect(container.querySelectorAll('mark')).toHaveLength(1);

    instance.mark('world', { renderer: 'dom' });
    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('mark')!.textContent).toBe('world');

    instance.destroy();
  });

  it('markRegExp highlights regex matches', () => {
    container.innerHTML = '<p>foo 123 bar 456</p>';
    const instance = markit(container);
    instance.markRegExp(/\d+/g, { renderer: 'dom' });

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]!.textContent).toBe('123');
    expect(marks[1]!.textContent).toBe('456');

    instance.destroy();
  });

  it('markRanges highlights specific character ranges', () => {
    container.innerHTML = '<p>hello world</p>';
    const instance = markit(container);
    instance.markRanges(
      [{ start: 0, length: 5 }, { start: 6, length: 5 }],
      { renderer: 'dom' },
    );

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]!.textContent).toBe('hello');
    expect(marks[1]!.textContent).toBe('world');

    instance.destroy();
  });

  it('respects exclude selectors', () => {
    container.innerHTML = '<p>visible</p><p class="no-mark">excluded</p>';
    const instance = markit(container);
    instance.mark('visible', { renderer: 'dom', exclude: ['.no-mark'] });

    expect(container.querySelectorAll('mark')).toHaveLength(1);
    // Make sure excluded content is not wrapped
    expect(container.querySelector('.no-mark mark')).toBeNull();

    instance.destroy();
  });

  it('destroy() cleans up everything', () => {
    container.innerHTML = '<p>hello world</p>';
    const instance = markit(container);
    instance.mark('hello', { renderer: 'dom' });

    instance.destroy();

    // After destroy, highlights should be removed
    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(instance.getMatches()).toHaveLength(0);
  });

  it('handles empty container gracefully', () => {
    const instance = markit(container);
    instance.mark('hello', { renderer: 'dom' });
    expect(instance.getMatches()).toHaveLength(0);
    instance.destroy();
  });

  it('handles deeply nested DOM', () => {
    container.innerHTML = '<div><section><article><p>deep content here</p></article></section></div>';
    const instance = markit(container);
    instance.mark('deep', { renderer: 'dom' });

    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('mark')!.textContent).toBe('deep');

    instance.destroy();
  });

  describe('plugin system', () => {
    it('runs beforeSearch plugin hook', () => {
      container.innerHTML = '<p>hello world</p>';
      const instance = markit(container, [{
        name: 'test-plugin',
        beforeSearch: (term) => term.toUpperCase(),
      }]);

      instance.mark('hello', { renderer: 'dom', caseSensitive: true });
      // The plugin uppercases the search term, so 'hello' won't match 'HELLO'
      expect(instance.getMatches()).toHaveLength(0);

      instance.destroy();
    });

    it('runs afterMatch plugin hook', () => {
      container.innerHTML = '<p>foo bar baz</p>';
      const instance = markit(container, [{
        name: 'limiter',
        afterMatch: (matches) => matches.slice(0, 1),
      }]);

      instance.mark('foo', { renderer: 'dom' });
      expect(instance.getMatches()).toHaveLength(1);

      instance.destroy();
    });

    it('runs afterRender plugin hook', () => {
      const afterRender = vi.fn();
      container.innerHTML = '<p>hello</p>';
      const instance = markit(container, [{
        name: 'notifier',
        afterRender,
      }]);

      instance.mark('hello', { renderer: 'dom' });
      expect(afterRender).toHaveBeenCalledWith(1, expect.any(Object));

      instance.destroy();
    });
  });
});
