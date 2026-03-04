# Performance

MarkIt is designed to be as fast as Chrome's native Find in Page. Here's how.

## Architecture

### Text Index

The core builds a flat index of all text nodes using `TreeWalker` — the fastest DOM traversal API (implemented in native C++ in browsers). Each node is mapped to a position in a virtual concatenated string.

```
<p>hello</p><p>world</p>  →  "helloworld"
  chunk[0]: node=Text("hello"), start=0, end=5
  chunk[1]: node=Text("world"), start=5, end=10
```

Matches are found against the virtual string in a single pass, then mapped back to DOM nodes via **binary search** — O(log n) per match.

### Rendering

| Renderer          | DOM Mutations  | Reflows          | Use Case                                        |
| ----------------- | -------------- | ---------------- | ----------------------------------------------- |
| CSS Highlight API | 0              | 0                | Default — fastest, no layout impact             |
| DOM Wrapping      | Per match      | Batched          | When you need click handlers or custom elements |
| Overlay           | Container only | On scroll/resize | Maximum framework isolation                     |

## Optimization Strategies

### Debounced Live Search

For search-as-you-type, use the `debounce` option:

```typescript
instance.mark(term, { debounce: 150 });
```

### Exclude Non-Searchable Content

Skip headers, nav, ads, etc.:

```typescript
instance.mark(term, {
  exclude: ['nav', '.sidebar', '[data-no-search]'],
});
```

### Choose the Right Renderer

- **highlight-api**: Zero layout cost. Use for 10K+ nodes.
- **dom**: Full styling. Use when you need `border-radius`, click events, etc.
- **overlay**: Use when framework isolation is critical.

### Batched Rendering

For very large DOMs (50K+ nodes) where the DOM renderer produces thousands of matches, synchronous rendering can block the main thread. Use `batchSize` to split rendering across animation frames:

```typescript
instance.mark('the', {
  renderer: 'dom',
  batchSize: 500,
  done: (count) => {
    // Called once all batches are rendered
    updateUI(count);
  },
});
```

With `batchSize: 500` and 2,000 matches:

| Frame | Action                                         |
| ----- | ---------------------------------------------- |
| 1     | Render matches 0–499, yield                    |
| 2     | Render matches 500–999, yield                  |
| 3     | Render matches 1000–1499, yield                |
| 4     | Render matches 1500–1999, fire `done` callback |

The search phase (finding matches) is always synchronous — `getMatches()` returns results immediately. Only the rendering phase is batched.

Batching uses `requestIdleCallback` when available (Chrome, Firefox) and falls back to `requestAnimationFrame`. Calling `mark()` again while a batch is in progress cancels the previous batch automatically.

### Debug Mode

Enable timing logs:

```typescript
instance.mark(term, { debug: true });
// Console: [markit] search: 2.1ms
// Console: [markit] found 142 matches
// Console: [markit] render: 0.8ms
```

## Benchmarks

Run the Playwright benchmark suite for real-browser performance numbers:

```bash
cd apps/e2e-bench
npx playwright test
```

### Typical Results (M1 MacBook, Chrome)

| Scenario       | 1K nodes | 10K nodes | 50K nodes |
| -------------- | -------- | --------- | --------- |
| Single keyword | < 5ms    | < 30ms    | < 150ms   |
| 5 keywords     | < 10ms   | < 60ms    | < 300ms   |
| Regex          | < 10ms   | < 50ms    | < 250ms   |
| Unmark         | < 2ms    | < 15ms    | < 80ms    |

_These are synchronous render numbers. With `batchSize: 500`, total wall time is similar but the UI stays responsive throughout._

_All numbers are real-browser (Playwright + Chromium), not jsdom. jsdom is 50-100x slower._

## How Chrome Find-in-Page Works

For context, Chrome's `TextFinder` in Blink:

1. Operates on the flat text representation of the render tree
2. Uses ICU string search (Boyer-Moore variant)
3. Highlights via the compositor using document markers (no DOM mutation)
4. Searches incrementally, one match at a time

MarkIt's Highlight API engine mirrors this architecture — both avoid DOM mutation and operate at the rendering level.
