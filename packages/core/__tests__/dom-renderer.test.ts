import { describe, it, expect, beforeEach } from 'vitest';
import { DomRenderer } from '../src/engines/dom-renderer.js';
import { TextIndex } from '../src/search/text-index.js';
import { createMatcher } from '../src/search/matcher.js';
import type { MarkitOptions, ResolvedMatch } from '../src/types.js';

describe('DomRenderer', () => {
  let container: HTMLElement;
  let renderer: DomRenderer;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    renderer = new DomRenderer();

    return () => {
      renderer.destroy();
      document.body.removeChild(container);
    };
  });

  function highlightAndResolve(
    html: string,
    term: string,
    options: Partial<MarkitOptions> = {},
  ): ResolvedMatch[] {
    container.innerHTML = html;
    const index = new TextIndex(container, options.exclude);
    const matcher = createMatcher(term, options);
    const matches = matcher.findMatches(index.getVirtualText());
    return matches.map((m) => index.resolveMatch(m));
  }

  it('wraps matched text in <mark> elements by default', () => {
    const resolved = highlightAndResolve('<p>hello world</p>', 'hello');
    renderer.render(resolved, { element: 'mark', className: 'markit-match' } as MarkitOptions);

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]!.textContent).toBe('hello');
    expect(marks[0]!.classList.contains('markit-match')).toBe(true);
  });

  it('wraps with a custom element and class', () => {
    const resolved = highlightAndResolve('<p>test content</p>', 'test');
    renderer.render(resolved, {
      element: 'span',
      className: 'custom-highlight',
    } as MarkitOptions);

    const spans = container.querySelectorAll('span.custom-highlight');
    expect(spans).toHaveLength(1);
    expect(spans[0]!.textContent).toBe('test');
  });

  it('preserves surrounding text after wrapping', () => {
    const resolved = highlightAndResolve('<p>hello world</p>', 'world');
    renderer.render(resolved, { element: 'mark', className: 'markit-match' } as MarkitOptions);

    const p = container.querySelector('p')!;
    expect(p.textContent).toBe('hello world');
    expect(p.querySelector('mark')!.textContent).toBe('world');
  });

  it('handles multiple matches in the same text node', () => {
    const resolved = highlightAndResolve('<p>foo bar foo</p>', 'foo');
    renderer.render(resolved, { element: 'mark', className: 'markit-match' } as MarkitOptions);

    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
  });

  it('sets data-markit-id attribute on each wrapper', () => {
    const resolved = highlightAndResolve('<p>hello world</p>', 'hello');
    renderer.render(resolved, { element: 'mark', className: 'markit-match' } as MarkitOptions);

    const mark = container.querySelector('mark')!;
    expect(mark.getAttribute('data-markit-id')).toBeTruthy();
  });

  it('clear() removes all wrappers and normalizes text', () => {
    const resolved = highlightAndResolve('<p>hello world</p>', 'hello');
    renderer.render(resolved, { element: 'mark', className: 'markit-match' } as MarkitOptions);

    expect(container.querySelectorAll('mark')).toHaveLength(1);

    renderer.clear();

    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.querySelector('p')!.textContent).toBe('hello world');
    // Text nodes should be normalized (merged back)
    expect(container.querySelector('p')!.childNodes).toHaveLength(1);
  });

  it('does not use innerHTML', () => {
    const originalInnerHTML = Object.getOwnPropertyDescriptor(
      Element.prototype,
      'innerHTML',
    );

    let innerHTMLSet = false;
    Object.defineProperty(container, 'innerHTML', {
      set() {
        innerHTMLSet = true;
      },
      get: originalInnerHTML?.get,
      configurable: true,
    });

    // Manually create DOM instead of innerHTML for setup
    const p = document.createElement('p');
    p.textContent = 'hello world';
    container.appendChild(p);

    const index = new TextIndex(container);
    const matcher = createMatcher('hello', {});
    const matches = matcher.findMatches(index.getVirtualText());
    const resolved = matches.map((m) => index.resolveMatch(m));

    renderer.render(resolved, { element: 'mark', className: 'markit-match' } as MarkitOptions);

    expect(innerHTMLSet).toBe(false);

    // Restore
    if (originalInnerHTML) {
      Object.defineProperty(container, 'innerHTML', originalInnerHTML);
    }
  });

  it('preserves existing element structure and event listeners', () => {
    const button = document.createElement('button');
    button.textContent = 'Click hello here';
    let clicked = false;
    button.addEventListener('click', () => { clicked = true; });
    container.appendChild(button);

    const index = new TextIndex(container);
    const matcher = createMatcher('hello', {});
    const matches = matcher.findMatches(index.getVirtualText());
    const resolved = matches.map((m) => index.resolveMatch(m));

    renderer.render(resolved, { element: 'mark', className: 'markit-match' } as MarkitOptions);

    // Event listener should still work
    button.click();
    expect(clicked).toBe(true);

    // Button should still be in the DOM
    expect(container.querySelector('button')).toBeTruthy();
  });
});
