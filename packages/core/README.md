# @markitjs/core

Framework-agnostic, high-performance text highlighting engine. Serves as the foundation for `@markitjs/react` and `@markitjs/angular`.

## Install

```bash
npm install @markitjs/core
# or
bun add @markitjs/core
```

## Quick Start

```ts
import { markit } from '@markitjs/core';

const instance = markit(document.querySelector('#content'));

// Keyword highlighting
instance.mark('hello');

// Multiple keywords
instance.mark(['hello', 'world']);

// Regex
instance.markRegExp(/\b\w{6,}\b/g);

// Clear
instance.unmark();

// Cleanup
instance.destroy();
```

## Rendering Engines

The library ships with three rendering strategies, selectable via the `renderer` option:

| Engine         | Option            | DOM Mutations | Browser Support                                    |
| -------------- | ----------------- | ------------- | -------------------------------------------------- |
| CSS Highlight  | `'highlight-api'` | None          | Chrome 105+, Edge 105+, Safari 17.2+, Firefox 140+ |
| DOM Wrapping   | `'dom'`           | Yes           | All browsers                                       |
| Overlay        | `'overlay'`       | Minimal       | All browsers                                       |
| Auto (default) | `'auto'`          | Varies        | Feature-detected                                   |

`auto` prefers the CSS Custom Highlight API when available, falling back to DOM wrapping. The DOM renderer never removes the original text node—only updates its `textContent` and inserts wrappers—so framework bindings (Angular, React, etc.) keep updating correctly, including when the match is at the start of the text.

## Multiple instances

With the CSS Highlight API (or `auto`), multiple MarkIt instances share one `Highlight` per registry name. They do not overwrite each other when several highlighters are on the page. Use the `highlightName` option to register under a different name (e.g. for separate highlight styles or isolation).

## Options

```ts
instance.mark('search term', {
  renderer: 'auto', // 'highlight-api' | 'dom' | 'overlay' | 'auto'
  caseSensitive: false,
  ignoreDiacritics: false,
  acrossElements: false,
  separateWordSearch: false,
  accuracy: 'partially', // 'partially' | 'exactly' | 'startsWith' | 'complementary'
  wildcards: 'disabled', // 'disabled' | 'enabled' | 'withSpaces'
  ignoreJoiners: false,
  ignorePunctuation: [],
  synonyms: {},
  exclude: [],
  element: 'mark',
  className: 'markit-match',
  highlightName: 'markit-highlight',
  batchSize: 0, // > 0 enables incremental rendering
  debounce: 0,
  debug: false,

  // Callbacks
  each: (element, info) => {},
  done: (totalMatches) => {},
  noMatch: (term) => {},
  filter: (textNode, term, matchIndex, totalMatches) => true,
});
```

## Plugins

```ts
import { markit, type MarkitPlugin } from '@markitjs/core';

const logger: MarkitPlugin = {
  name: 'logger',
  afterMatch(matches) {
    console.log(`Found ${matches.length} matches`);
    return matches;
  },
};

const instance = markit(element, [logger]);
```

## CSS Highlight API Styling

When using the `highlight-api` or `auto` renderer, style matches with the `::highlight()` pseudo-element:

```css
::highlight(markit-highlight) {
  background-color: #fef08a;
  color: inherit;
}
```

## Batched Rendering

For very large DOM trees (50K+ nodes), enable batched rendering to keep the UI responsive:

```ts
instance.mark('term', {
  batchSize: 500,
  done: (count) => console.log(`${count} matches rendered`),
});
```

Rendering is split across `requestIdleCallback` / `requestAnimationFrame` frames. New `mark()` calls automatically cancel any in-progress batch.

## API Reference

### `markit(element, plugins?)`

Creates and returns a `MarkitInstance`.

### `MarkitInstance`

| Method                         | Description                    |
| ------------------------------ | ------------------------------ |
| `mark(term, options?)`         | Highlight keyword(s)           |
| `markRegExp(regexp, options?)` | Highlight regex matches        |
| `markRanges(ranges, options?)` | Highlight specific char ranges |
| `unmark(options?)`             | Remove all highlights          |
| `getMatches()`                 | Get current `MatchResult[]`    |
| `destroy()`                    | Clean up and free resources    |

## License

MIT
