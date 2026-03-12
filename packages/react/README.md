# @markitjs/react

React bindings for the [@markitjs/core](https://github.com/saurabhiam/markit/tree/main/packages/core) text highlighting engine. Provides a `useHighlight` hook and a declarative `Highlighter` component.

## Install

```bash
npm install @markitjs/react
# or
bun add @markitjs/react
# or
pnpm add @markitjs/react
```

**Peer dependencies:** React 18+ or 19+, and `@markitjs/core` (installed automatically by npm 7+, pnpm, and Yarn).

## Quick Start

### Hook

**Next.js App Router:** Add `"use client"` at the top of any file that uses the hook or `<Highlighter>`.

```tsx
import { useHighlight } from '@markitjs/react';

function SearchResults({ query }: { query: string }) {
  const ref = useHighlight(query, { caseSensitive: false });

  return (
    <div ref={ref}>
      <p>Content to search and highlight.</p>
    </div>
  );
}
```

### Component

```tsx
import { Highlighter } from '@markitjs/react';

function App() {
  return (
    <Highlighter term="react" accuracy="exactly">
      <article>
        <p>React is a JavaScript library for building user interfaces.</p>
      </article>
    </Highlighter>
  );
}
```

## API

### `useHighlight(term, options?)`

Returns a `ref` to attach to the container element.

```ts
const ref = useHighlight<HTMLDivElement>(term, {
  // All @markitjs/core options, plus:
  plugins: [], // MarkitPlugin[]
  timing: 'effect', // 'effect' (default) | 'layout'
  contentKey: value, // optional: re-run when content identity changes
});
```

| Option       | Type                   | Description                                                                                                                                 |
| ------------ | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `timing`     | `'effect' \| 'layout'` | `'effect'` runs after paint (SSR-safe). `'layout'` runs before paint — use with the DOM renderer to avoid a flash of unhighlighted content. |
| `plugins`    | `MarkitPlugin[]`       | Plugins to register with the core instance.                                                                                                 |
| `contentKey` | `Key \| Key[]`         | When content is dynamic, pass value(s) that change with content so the effect re-runs and re-applies.                                       |

All other options are passed through to `@markitjs/core`'s `mark()` method. For dynamic content (e.g. state or props), pass `contentKey` so highlights re-apply when content changes and avoid garbled text. See [Framework lifecycles](../../apps/docs/guide/framework-lifecycles.md) for how the React highlight cycle works.

### `Highlighter`

Declarative component that wraps children and highlights matching text.

```tsx
<Highlighter
  term="search" // string | string[]
  as="div" // Container element tag (default: 'div')
  className="my-class" // Container CSS class
  style={{ padding: 16 }} // Container inline styles
  contentKey={contentId} // optional: for dynamic content
  caseSensitive={false} // Any @markitjs/core option
  renderer="auto"
/>
```

## Safety

The bindings are designed to be safe across React's rendering model:

| Concern                   | How it's handled                                          |
| ------------------------- | --------------------------------------------------------- |
| **StrictMode**            | Cleanup runs before re-invocation; `unmark` is idempotent |
| **Concurrent rendering**  | Effects only run on committed renders                     |
| **Next.js SSR/hydration** | `useEffect` doesn't run on the server or during hydration |
| **Re-renders**            | Options are shallow-compared; no work if nothing changed  |
| **Unmount**               | `destroy()` is called in the effect cleanup               |

## Performance

- **Term:** A string term is already stable (same value = no extra work). When `term` is an array, the hook compares by **contents**, not reference: passing a new array with the same items (e.g. `[word1, word2]` every render) will not re-run the effect. Optionally use `useMemo` for the array if you want to avoid that internal comparison.
- **Options:** Pass a stable options object (e.g. `useMemo(() => ({ ... }), [deps])` or a constant) so the effect does not re-run when nothing actually changed. Options are shallow-compared; a new object reference every render may trigger re-runs even when values are the same.

## Next.js Usage

The `Highlighter` component includes a `'use client'` directive. Use it inside Client Components:

```tsx
// app/search/results.tsx
'use client';

import { Highlighter } from '@markitjs/react';

export function Results({ query, html }: { query: string; html: string }) {
  return (
    <Highlighter term={query} renderer="auto">
      <div dangerouslySetInnerHTML={{ __html: html }} />
    </Highlighter>
  );
}
```

Server Components can render the content; the `Highlighter` applies highlights client-side after hydration.

## Batched Rendering

For large content areas, enable batched rendering to keep the UI responsive:

```tsx
const ref = useHighlight(query, {
  batchSize: 500,
  done: (count) => setMatchCount(count),
});
```

## CSS Highlight API Styling

When using the default `auto` renderer on supported browsers, add this CSS:

```css
::highlight(markit-highlight) {
  background-color: #fef08a;
  color: inherit;
}
```

## License

MIT
