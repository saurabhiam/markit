import { describe, it, expect, vi, beforeEach } from 'vitest';
import { markit } from '../src/markit.js';
import { DomRenderer } from '../src/engines/dom-renderer.js';
import { TextIndex } from '../src/search/text-index.js';
import { createMatcher } from '../src/search/matcher.js';
import { scheduleBatched } from '../src/utils/scheduler.js';
import type { MarkitOptions, ResolvedMatch } from '../src/types.js';

function waitForFrames(count = 5): Promise<void> {
  return new Promise((resolve) => {
    let remaining = count;
    function tick() {
      remaining--;
      if (remaining <= 0) {
        resolve();
      } else {
        requestAnimationFrame(tick);
      }
    }
    requestAnimationFrame(tick);
  });
}

describe('scheduleBatched utility', () => {
  it('processes all items in batches', async () => {
    const processed: number[][] = [];

    scheduleBatched(
      [1, 2, 3, 4, 5],
      (batch) => { processed.push([...batch]); },
      2,
      () => {},
    );

    await waitForFrames(10);

    expect(processed).toEqual([[1, 2], [3, 4], [5]]);
  });

  it('calls onComplete when finished', async () => {
    const onComplete = vi.fn();

    scheduleBatched([1, 2, 3], () => {}, 2, onComplete);

    await waitForFrames(10);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('returns a cancel function that stops processing', async () => {
    const processed: number[][] = [];
    const onComplete = vi.fn();

    const cancel = scheduleBatched(
      [1, 2, 3, 4, 5, 6, 7, 8],
      (batch) => {
        processed.push([...batch]);
        if (processed.length === 1) cancel();
      },
      2,
      onComplete,
    );

    await waitForFrames(10);

    expect(processed.length).toBeLessThanOrEqual(2);
    expect(onComplete).not.toHaveBeenCalled();
  });

  it('handles empty items array', async () => {
    const onComplete = vi.fn();

    scheduleBatched([], () => {}, 5, onComplete);

    await waitForFrames(5);

    expect(onComplete).toHaveBeenCalledTimes(1);
  });

  it('processes single batch when items fit in one batch', async () => {
    const processed: number[][] = [];

    scheduleBatched([1, 2], (batch) => { processed.push([...batch]); }, 10, () => {});

    await waitForFrames(5);

    expect(processed).toEqual([[1, 2]]);
  });
});

describe('DomRenderer.renderBatch', () => {
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

  function resolveMatches(
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

  it('appends highlights without clearing existing ones', () => {
    const p = document.createElement('p');
    p.textContent = 'aaa bbb ccc';
    container.appendChild(p);

    const index = new TextIndex(container);
    const matcher1 = createMatcher('aaa', {});
    const matches1 = matcher1.findMatches(index.getVirtualText());
    const resolved1 = matches1.map((m) => index.resolveMatch(m));

    const opts = { element: 'mark', className: 'markit-match' } as MarkitOptions;

    // Render first batch via render() (clears + renders)
    renderer.render(resolved1, opts);
    expect(container.querySelectorAll('mark')).toHaveLength(1);

    // Now renderBatch should ADD without clearing
    const index2 = new TextIndex(container);
    const matcher2 = createMatcher('ccc', {});
    const matches2 = matcher2.findMatches(index2.getVirtualText());
    const resolved2 = matches2.map((m) => index2.resolveMatch(m));

    renderer.renderBatch(resolved2, opts);
    expect(container.querySelectorAll('mark')).toHaveLength(2);
  });

  it('handles reverse-sorted batches across text node splits', () => {
    const resolved = resolveMatches('<p>alpha beta gamma</p>', 'a');
    // "a" appears at multiple positions. Sort in reverse order.
    const sorted = [...resolved].sort((a, b) => b.match.start - a.match.start);

    const opts = { element: 'mark', className: 'markit-match' } as MarkitOptions;

    // Split into 2 batches manually
    const mid = Math.ceil(sorted.length / 2);
    const batch1 = sorted.slice(0, mid);
    const batch2 = sorted.slice(mid);

    renderer.renderBatch(batch1, opts);
    const count1 = container.querySelectorAll('mark').length;
    expect(count1).toBe(batch1.length);

    renderer.renderBatch(batch2, opts);
    const total = container.querySelectorAll('mark').length;
    expect(total).toBe(sorted.length);
  });

  it('clear() removes all elements from all batches', () => {
    const resolved = resolveMatches('<p>foo bar foo baz foo</p>', 'foo');
    const sorted = [...resolved].sort((a, b) => b.match.start - a.match.start);

    const opts = { element: 'mark', className: 'markit-match' } as MarkitOptions;

    renderer.renderBatch(sorted.slice(0, 1), opts);
    renderer.renderBatch(sorted.slice(1), opts);

    expect(container.querySelectorAll('mark').length).toBeGreaterThan(0);

    renderer.clear();
    expect(container.querySelectorAll('mark')).toHaveLength(0);
  });
});

describe('markit batched rendering', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);

    return () => {
      document.body.removeChild(container);
    };
  });

  it('renders synchronously when batchSize is 0', () => {
    container.innerHTML = '<p>hello world hello</p>';
    const instance = markit(container);
    instance.mark('hello', { renderer: 'dom', batchSize: 0 });

    // Synchronous — marks should exist immediately
    expect(container.querySelectorAll('mark')).toHaveLength(2);

    instance.destroy();
  });

  it('renders synchronously when matches fit in one batch', () => {
    container.innerHTML = '<p>hello world hello</p>';
    const instance = markit(container);
    instance.mark('hello', { renderer: 'dom', batchSize: 100 });

    // 2 matches < batchSize 100, so synchronous path
    expect(container.querySelectorAll('mark')).toHaveLength(2);

    instance.destroy();
  });

  it('renders asynchronously when matches exceed batchSize', async () => {
    // Generate enough text to produce many matches
    const words = Array.from({ length: 50 }, (_, i) => `word${i} the`).join(' ');
    container.innerHTML = `<p>${words}</p>`;

    const done = vi.fn();
    const instance = markit(container);
    instance.mark('the', { renderer: 'dom', batchSize: 5, done });

    // Matches are set immediately (search is sync)
    expect(instance.getMatches().length).toBe(50);

    // But done callback hasn't fired yet (rendering is async)
    expect(done).not.toHaveBeenCalled();

    await waitForFrames(30);

    // After frames, rendering and callbacks should be complete
    expect(done).toHaveBeenCalledWith(50);
    expect(container.querySelectorAll('mark').length).toBe(50);

    instance.destroy();
  });

  it('cancels previous batch when mark() is called again', async () => {
    const words = Array.from({ length: 40 }, () => 'abc def').join(' ');
    container.innerHTML = `<p>${words}</p>`;

    const done1 = vi.fn();
    const done2 = vi.fn();
    const instance = markit(container);

    instance.mark('abc', { renderer: 'dom', batchSize: 3, done: done1 });

    // Immediately call mark() again — should cancel first batch
    instance.mark('def', { renderer: 'dom', batchSize: 3, done: done2 });

    await waitForFrames(30);

    // First done should never have been called
    expect(done1).not.toHaveBeenCalled();
    expect(done2).toHaveBeenCalledWith(40);

    instance.destroy();
  });

  it('unmark cancels in-progress batch', async () => {
    const words = Array.from({ length: 30 }, () => 'test xyz').join(' ');
    container.innerHTML = `<p>${words}</p>`;

    const done = vi.fn();
    const instance = markit(container);

    instance.mark('test', { renderer: 'dom', batchSize: 3, done });

    // Immediately unmark
    instance.unmark();

    await waitForFrames(20);

    expect(done).not.toHaveBeenCalled();
    expect(container.querySelectorAll('mark')).toHaveLength(0);

    instance.destroy();
  });

  it('destroy cancels in-progress batch', async () => {
    const words = Array.from({ length: 30 }, () => 'test xyz').join(' ');
    container.innerHTML = `<p>${words}</p>`;

    const done = vi.fn();
    const instance = markit(container);

    instance.mark('test', { renderer: 'dom', batchSize: 3, done });

    instance.destroy();

    await waitForFrames(20);

    expect(done).not.toHaveBeenCalled();
  });

  it('getMatches() returns all matches immediately even during batched render', () => {
    const words = Array.from({ length: 20 }, () => 'alpha beta').join(' ');
    container.innerHTML = `<p>${words}</p>`;

    const instance = markit(container);
    instance.mark('alpha', { renderer: 'dom', batchSize: 3 });

    // getMatches should reflect all matches found during search (sync)
    expect(instance.getMatches().length).toBe(20);

    instance.destroy();
  });

  it('fires each callback after all batches complete', async () => {
    const words = Array.from({ length: 10 }, () => 'mark me').join(' ');
    container.innerHTML = `<p>${words}</p>`;

    const each = vi.fn();
    const instance = markit(container);

    instance.mark('mark', { renderer: 'dom', batchSize: 3, each });

    // each is deferred until all batches complete
    expect(each).not.toHaveBeenCalled();

    await waitForFrames(20);

    expect(each).toHaveBeenCalledTimes(10);

    instance.destroy();
  });

  it('batching works with markRegExp', async () => {
    const words = Array.from({ length: 20 }, (_, i) => `num${i}`).join(' ');
    container.innerHTML = `<p>${words}</p>`;

    const done = vi.fn();
    const instance = markit(container);

    instance.markRegExp(/num\d+/g, { renderer: 'dom', batchSize: 5, done });

    expect(instance.getMatches().length).toBe(20);

    await waitForFrames(20);

    expect(done).toHaveBeenCalledWith(20);
    expect(container.querySelectorAll('mark').length).toBe(20);

    instance.destroy();
  });
});
