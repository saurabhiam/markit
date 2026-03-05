# @markitjs/react

React bindings for the [@markitjs/core](https://github.com/saurabhiam/markit/tree/main/packages/core) text highlighting engine. Provides a `useHighlight` hook and a declarative `Highlighter` component.

## Install

```bash
npm install @markitjs/react
# or
bun add @markitjs/react
```

**Peer dependencies:** React 18+ or 19+

## Quick Start

### Hook

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
});
```

| Option    | Type                   | Description                                                                                            |
| --------- | ---------------------- | ------------------------------------------------------------------------------------------------------ |
| `timing`  | `'effect' \| 'layout'` | `'effect'` runs after paint (SSR-safe). `'layout'` runs before paint (avoids flash with DOM renderer). |
| `plugins` | `MarkitPlugin[]`       | Plugins to register with the core instance.                                                            |

All other options are passed through to `@markitjs/core`'s `mark()` method.

### `Highlighter`

Declarative component that wraps children and highlights matching text.

```tsx
<Highlighter
  term="search" // string | string[]
  as="div" // Container element tag (default: 'div')
  className="my-class" // Container CSS class
  style={{ padding: 16 }} // Container inline styles
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
