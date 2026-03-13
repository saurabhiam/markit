# React / Next.js Integration

`@markitjs/react` provides a hook and declarative component for text highlighting.

## Installation

::: code-group

```bash [npm]
npm install @markitjs/react
```

```bash [bun]
bun add @markitjs/react
```

```bash [pnpm]
pnpm add @markitjs/react
```

```bash [yarn]
yarn add @markitjs/react @markitjs/core
```

:::

**Peer dependencies:** `@markitjs/core` (and React) are required. npm 7+, pnpm, and bun install them automatically. **With Yarn**, install `@markitjs/core` explicitly: `yarn add @markitjs/react @markitjs/core`.

## Hook Usage

`useHighlight` returns a ref to attach to your container element.

**Next.js App Router:** Add `"use client"` at the top of any file that uses `useHighlight` or renders `<Highlighter>` (they use React hooks).

```tsx
'use client';

import { useHighlight } from '@markitjs/react';

function SearchResults({ query }: { query: string }) {
  const ref = useHighlight(query, { caseSensitive: false });

  return (
    <div ref={ref}>
      <p>This content will be searched and highlighted.</p>
    </div>
  );
}
```

### Hook Options

```tsx
const ref = useHighlight(term, {
  renderer: 'dom', // or 'highlight-api', 'overlay', 'auto'
  timing: 'effect', // 'layout' runs before paint — use with DOM renderer to avoid flash
  caseSensitive: false,
  accuracy: 'exactly',
  ignoreDiacritics: true,
  exclude: ['.no-highlight'],
  plugins: [myPlugin],
});
```

## Component Usage

`Highlighter` is a declarative wrapper around `useHighlight`.

```tsx
import { Highlighter } from '@markitjs/react';

function App() {
  const [query, setQuery] = useState('');

  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <Highlighter term={query} caseSensitive={false}>
        <article>
          <p>Content to be searched and highlighted.</p>
        </article>
      </Highlighter>
    </>
  );
}
```

### Props

| Prop         | Type                 | Default | Description                                                                  |
| ------------ | -------------------- | ------- | ---------------------------------------------------------------------------- |
| `term`       | `string \| string[]` | —       | Search term(s)                                                               |
| `as`         | `string`             | `'div'` | Container HTML tag                                                           |
| `className`  | `string`             | —       | Container CSS class                                                          |
| `style`      | `CSSProperties`      | —       | Container inline styles                                                      |
| `contentKey` | `Key \| Key[]`       | —       | When content is dynamic, pass value(s) that change with content (see below). |
| ...options   | `MarkitOptions`      | —       | All core options are accepted as props                                       |

### Dynamic content

When the highlighted content comes from state or props and can change (e.g. tab content, search results list), pass `contentKey` so the effect re-runs when the content identity changes. Use the same value(s) you would use to key the content — for example, an item id or a stringified version of the data. Without `contentKey`, the previous highlight state can overlap the new DOM and produce garbled text. With `<Highlighter>`, pass `contentKey={value}`; the component keys the inner wrapper so React mounts fresh content before re-applying highlights.

For a full picture of the React highlight cycle, see [Framework lifecycles](./framework-lifecycles).

## Next.js / SSR Safety

### App Router: use Client Components

In the **App Router**, any file that uses `useHighlight` or renders `<Highlighter>` must be a **Client Component**: add `"use client"` at the top of that file. The library is **SSR-safe** (no hydration mismatch) when used inside a Client Component — highlights are applied after hydration.

### Why It's Safe

- `useHighlight` uses `useEffect`, which **does not run during SSR or hydration**
- Server-rendered HTML contains no `<mark>` elements
- Highlights are applied only after hydration completes
- No hydration mismatch warnings

### Server Components

The `Highlighter` component is marked `'use client'`. It can wrap Server Component output:

```tsx
// page.tsx (Server Component)
import { Highlighter } from '@markitjs/react';
import { ArticleContent } from './article-content'; // Server Component

export default function Page() {
  return (
    <Highlighter term="search">
      <ArticleContent />
    </Highlighter>
  );
}
```

## React Safety Details

### StrictMode

`useHighlight` is idempotent — the cleanup function runs before re-invocation, so StrictMode's double-invoke doesn't produce duplicate highlights.

### Concurrent Rendering

Effects only run on committed renders. Interrupted renders never execute effects, so highlighting is always consistent.

### Re-render Behavior

When the `term` or `options` change, the effect:

1. Cleans up previous highlights (`destroy()`)
2. Creates a new instance
3. Applies new highlights

**Term** is stabilized when it's an array: the effect re-runs only when the array's contents change, not when a new array reference with the same contents is passed. **Options** are shallow-compared to avoid unnecessary effect re-runs. For best performance, pass a stable term (e.g. `useMemo` for arrays) and stable options (e.g. `useMemo` for the options object).

## Batched Rendering

For pages with large content and thousands of matches, use `batchSize` to keep the UI responsive:

```tsx
const ref = useHighlight(query, {
  renderer: 'dom',
  batchSize: 500,
  done: (count) => {
    setMatchCount(count); // Safe: called after all batches complete
  },
});
```

Or with the `Highlighter` component:

```tsx
<Highlighter term={query} renderer="dom" batchSize={500} done={(count) => setMatchCount(count)}>
  <article>Long document content...</article>
</Highlighter>
```

### Cleanup safety

When the component unmounts or the term changes, `useHighlight` calls `destroy()` on the instance, which automatically cancels any in-progress batch. This is safe with StrictMode's double-invoke — the cleanup function runs before each re-invocation.

::: tip
`getMatches()` returns all matches immediately (search is synchronous), even while rendering is still in progress. Only the DOM rendering is batched.
:::
