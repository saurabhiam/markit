# Core API

## `markit(element, plugins?)`

Creates a MarkIt instance bound to a root DOM element.

```typescript
import { markit } from '@markit/core';

const instance = markit(document.getElementById('content'));
```

**Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `element` | `HTMLElement` | Root element to search within |
| `plugins` | `MarkitPlugin[]` | Optional array of plugins |

**Returns:** `MarkitInstance`

## Instance Methods

### `mark(term, options?)`

Highlight text matching the given term(s).

```typescript
instance.mark('hello');
instance.mark(['hello', 'world']);
instance.mark('hello', { caseSensitive: true });
```

### `markRegExp(regexp, options?)`

Highlight text matching a regular expression.

```typescript
instance.markRegExp(/\d+/g);
instance.markRegExp(/hello/gi, { element: 'span', className: 'found' });
```

### `markRanges(ranges, options?)`

Highlight specific character ranges in the text content.

```typescript
instance.markRanges([
  { start: 0, length: 5 },
  { start: 10, length: 3 },
]);
```

### `unmark()`

Remove all highlights from the container.

```typescript
instance.unmark();
```

### `getMatches()`

Get the current list of match results.

```typescript
const matches = instance.getMatches();
// [{ start: 0, end: 5, text: 'hello', term: 'hello' }, ...]
```

### `destroy()`

Remove all highlights and free resources. Always call this when you're done.

```typescript
instance.destroy();
```

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `renderer` | `'auto' \| 'highlight-api' \| 'dom' \| 'overlay'` | `'auto'` | Rendering strategy |
| `element` | `string` | `'mark'` | Wrapper element tag (DOM renderer only) |
| `className` | `string` | `'markit-match'` | CSS class on wrapper elements |
| `highlightName` | `string` | `'markit-highlight'` | CSS Highlight API registry name |
| `caseSensitive` | `boolean` | `false` | Case-sensitive matching |
| `ignoreDiacritics` | `boolean` | `false` | Strip diacritics before matching |
| `acrossElements` | `boolean` | `false` | Match across element boundaries |
| `separateWordSearch` | `boolean` | `false` | Split term into individual words |
| `accuracy` | `'partially' \| 'exactly' \| 'startsWith' \| 'complementary'` | `'partially'` | Match accuracy mode |
| `synonyms` | `SynonymMap` | — | Synonym expansion map |
| `wildcards` | `'disabled' \| 'enabled' \| 'withSpaces'` | `'disabled'` | Wildcard support |
| `ignoreJoiners` | `boolean` | `false` | Ignore zero-width characters |
| `ignorePunctuation` | `string[]` | — | Punctuation characters to ignore |
| `exclude` | `string[]` | — | CSS selectors to exclude from search |
| `debounce` | `number` | `0` | Debounce delay in ms for live search |
| `batchSize` | `number` | `0` | Render matches in async batches of this size (0 = synchronous) |
| `debug` | `boolean` | `false` | Log timing info to console |

## Callbacks

| Callback | Signature | Description |
|----------|-----------|-------------|
| `each` | `(element, info) => void` | Called for each match |
| `done` | `(totalMatches) => void` | Called when highlighting completes |
| `noMatch` | `(term) => void` | Called when no matches are found |
| `filter` | `(textNode, term, matchIndex, totalMatches) => boolean` | Return `false` to skip a match |

## Accuracy Modes

| Mode | Behavior | Example: searching "light" |
|------|----------|----------------------------|
| `'partially'` | Substring match | Matches "high**light**er", "**light**ning" |
| `'exactly'` | Whole word match | Matches "**light**" only, not "lighter" |
| `'startsWith'` | Word-start match | Matches "**light**", "**light**er", not "highlight" |
| `'complementary'` | Whitespace-delimited | Matches "**light**" surrounded by spaces/boundaries |

## Batched Rendering

When highlighting a large number of matches (thousands+), rendering can freeze the UI. Set `batchSize` to a positive number to split rendering across animation frames:

```typescript
instance.mark('the', {
  renderer: 'dom',
  batchSize: 500,
  done: (count) => {
    console.log(`Rendered ${count} matches`);
  },
});
```

### How it works

1. **Search is always synchronous** — `getMatches()` returns all results immediately, even while rendering is still in progress
2. **Rendering is split into batches** — each batch of N matches is rendered in one frame, then yields to the browser via `requestIdleCallback` (or `requestAnimationFrame` as fallback)
3. **Callbacks fire after all batches complete** — `done`, `each`, and `noMatch` are called once rendering finishes

### Behavior by value

| `batchSize` | Behavior |
|-------------|----------|
| `0` (default) | Synchronous — all matches rendered in one frame |
| `> 0`, matches ≤ batchSize | Synchronous — everything fits in a single batch |
| `> 0`, matches > batchSize | Async — split into ⌈matches/batchSize⌉ batches |

### Cancellation

Calling `mark()`, `unmark()`, or `destroy()` while a batched render is in progress automatically cancels the pending batch. Only the most recent `mark()` call's results are rendered.

### Framework compatibility

`batchSize` works with all framework wrappers — pass it through options like any other option:

**React:**
```tsx
const ref = useHighlight(query, { batchSize: 500, renderer: 'dom' });
```

**Angular directive:**
```html
<div [markitHighlight]="searchTerm" [markitOptions]="{ batchSize: 500 }">
```

**Angular service:**
```typescript
this.markitService.highlight(instance, term, { batchSize: 500 });
```

::: tip When to use batching
Use `batchSize` when the DOM renderer produces **500+ matches** and you want the UI to remain interactive during highlighting. The CSS Highlight API renderer is already non-blocking (zero DOM mutations), so batching provides less benefit there — but it still works.
:::
