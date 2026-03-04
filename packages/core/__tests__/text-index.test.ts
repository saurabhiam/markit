import { describe, it, expect, beforeEach } from 'vitest';
import { TextIndex } from '../src/search/text-index.js';

describe('TextIndex', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    return () => {
      document.body.removeChild(container);
    };
  });

  it('indexes text nodes into a flat virtual string', () => {
    container.innerHTML = '<p>hello</p><p>world</p>';
    const index = new TextIndex(container);

    expect(index.getVirtualText()).toBe('helloworld');
    expect(index.getChunkCount()).toBe(2);
  });

  it('builds correct offset map', () => {
    container.innerHTML = '<p>abc</p><p>def</p>';
    const index = new TextIndex(container);
    const chunks = index.getChunks();

    expect(chunks[0]!.start).toBe(0);
    expect(chunks[0]!.end).toBe(3);
    expect(chunks[1]!.start).toBe(3);
    expect(chunks[1]!.end).toBe(6);
  });

  it('handles nested elements', () => {
    container.innerHTML = '<div><span>hello</span> <em>world</em></div>';
    const index = new TextIndex(container);

    expect(index.getVirtualText()).toBe('hello world');
  });

  it('excludes elements matching exclude selectors', () => {
    container.innerHTML = '<p>visible</p><p class="hidden">excluded</p><p>also visible</p>';
    const index = new TextIndex(container, ['.hidden']);

    expect(index.getVirtualText()).toBe('visiblealso visible');
  });

  it('resolves a match to the correct text node and offset', () => {
    container.innerHTML = '<p>hello</p><p>world</p>';
    const index = new TextIndex(container);

    const match = { start: 0, end: 5, text: 'hello', term: 'hello' };
    const resolved = index.resolveMatch(match);

    expect(resolved.segments).toHaveLength(1);
    expect(resolved.segments[0]!.startOffset).toBe(0);
    expect(resolved.segments[0]!.endOffset).toBe(5);
  });

  it('resolves across-element matches to multiple segments', () => {
    container.innerHTML = '<span>hel</span><span>lo</span>';
    const index = new TextIndex(container);

    const match = { start: 0, end: 5, text: 'hello', term: 'hello' };
    const resolved = index.resolveMatch(match);

    expect(resolved.segments).toHaveLength(2);
    expect(resolved.segments[0]!.startOffset).toBe(0);
    expect(resolved.segments[0]!.endOffset).toBe(3);
    expect(resolved.segments[1]!.startOffset).toBe(0);
    expect(resolved.segments[1]!.endOffset).toBe(2);
  });

  it('handles empty text nodes', () => {
    container.innerHTML = '<p></p><p>content</p>';
    const index = new TextIndex(container);

    expect(index.getVirtualText()).toBe('content');
    expect(index.getChunkCount()).toBe(1);
  });

  it('rebuilds the index', () => {
    container.innerHTML = '<p>original</p>';
    const index = new TextIndex(container);
    expect(index.getVirtualText()).toBe('original');

    container.innerHTML = '<p>updated</p>';
    index.rebuild();
    expect(index.getVirtualText()).toBe('updated');
  });

  it('handles deeply nested DOM', () => {
    container.innerHTML = '<div><div><div><span>deep</span></div></div></div>';
    const index = new TextIndex(container);

    expect(index.getVirtualText()).toBe('deep');
    expect(index.getChunkCount()).toBe(1);
  });

  it('handles multiple text nodes in the same element', () => {
    const p = document.createElement('p');
    p.appendChild(document.createTextNode('first'));
    p.appendChild(document.createElement('br'));
    p.appendChild(document.createTextNode('second'));
    container.appendChild(p);

    const index = new TextIndex(container);
    expect(index.getVirtualText()).toBe('firstsecond');
    expect(index.getChunkCount()).toBe(2);
  });
});
