import { describe, it, expect } from 'vitest';
import { markit } from '../src/markit.js';

/**
 * Performance regression tests in jsdom.
 *
 * IMPORTANT: jsdom is 50-100x slower than real browsers for DOM operations.
 * These tests use small node counts with generous time budgets to verify
 * correctness of the performance-related code paths, NOT actual performance.
 *
 * For real performance benchmarking (10K-100K nodes), use Playwright tests
 * against a real browser. See apps/demo/ for the benchmark harness.
 */

function createDOM(nodeCount: number): HTMLElement {
  const container = document.createElement('div');
  const words = [
    'Lorem',
    'ipsum',
    'dolor',
    'sit',
    'amet',
    'consectetur',
    'adipiscing',
    'elit',
    'sed',
    'do',
    'eiusmod',
    'tempor',
    'incididunt',
    'ut',
    'labore',
    'et',
    'dolore',
    'magna',
    'aliqua',
    'highlight',
    'search',
    'performance',
    'benchmark',
    'testing',
  ];

  for (let i = 0; i < nodeCount; i++) {
    const p = document.createElement('p');
    const sentenceLength = 8 + (i % 12);
    const sentence = Array.from(
      { length: sentenceLength },
      (_, j) => words[(i * sentenceLength + j) % words.length],
    ).join(' ');
    p.textContent = sentence;
    container.appendChild(p);
  }

  return container;
}

describe('performance regression tests (jsdom)', () => {
  it('highlights 200 nodes', () => {
    const container = createDOM(200);
    document.body.appendChild(container);

    const instance = markit(container);
    const start = performance.now();
    instance.mark('Lorem', { renderer: 'dom' });
    const elapsed = performance.now() - start;

    expect(instance.getMatches().length).toBeGreaterThan(0);
    // jsdom budget: generous, just verify it completes
    expect(elapsed).toBeLessThan(2000);

    instance.destroy();
    document.body.removeChild(container);
  });

  it('unmarks cleanly after highlighting', () => {
    const container = createDOM(200);
    document.body.appendChild(container);

    const instance = markit(container);
    instance.mark('Lorem', { renderer: 'dom' });

    instance.unmark();
    expect(container.querySelectorAll('mark')).toHaveLength(0);

    instance.destroy();
    document.body.removeChild(container);
  });

  it('handles multiple keywords', () => {
    const container = createDOM(100);
    document.body.appendChild(container);

    const instance = markit(container);
    instance.mark(['Lorem', 'ipsum', 'dolor'], { renderer: 'dom' });

    expect(instance.getMatches().length).toBeGreaterThan(0);

    instance.destroy();
    document.body.removeChild(container);
  });

  it('regex search works on multi-node DOM', () => {
    const container = createDOM(100);
    document.body.appendChild(container);

    const instance = markit(container);
    instance.markRegExp(/Lorem/g, { renderer: 'dom' });

    expect(instance.getMatches().length).toBeGreaterThan(0);

    instance.destroy();
    document.body.removeChild(container);
  });

  it('repeated mark/unmark cycles do not leak wrappers', () => {
    const container = createDOM(50);
    document.body.appendChild(container);

    const instance = markit(container);

    for (let i = 0; i < 5; i++) {
      instance.mark('Lorem', { renderer: 'dom' });
      instance.unmark();
    }

    expect(container.querySelectorAll('mark')).toHaveLength(0);
    expect(container.children.length).toBe(50);

    instance.destroy();
    document.body.removeChild(container);
  });

  it('mark/unmark preserves original text content', () => {
    const container = createDOM(20);
    document.body.appendChild(container);
    const originalText = container.textContent;

    const instance = markit(container);
    instance.mark('Lorem', { renderer: 'dom' });
    instance.unmark();

    expect(container.textContent).toBe(originalText);

    instance.destroy();
    document.body.removeChild(container);
  });
});
