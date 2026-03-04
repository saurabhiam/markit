# React / Next.js Integration

`@markit/react` provides a hook and declarative component for text highlighting.

## Installation

```bash
npm install @markit/core @markit/react
```

## Hook Usage

`useHighlight` returns a ref to attach to your container element.

```tsx
import { useHighlight } from '@markit/react';

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
  renderer: 'dom',           // or 'highlight-api', 'overlay', 'auto'
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
import { Highlighter } from '@markit/react';

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

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `term` | `string \| string[]` | — | Search term(s) |
| `as` | `string` | `'div'` | Container HTML tag |
| `className` | `string` | — | Container CSS class |
| `style` | `CSSProperties` | — | Container inline styles |
| ...options | `MarkitOptions` | — | All core options are accepted as props |

## Next.js / SSR Safety

### Why It's Safe

- `useHighlight` uses `useEffect`, which **does not run during SSR or hydration**
- Server-rendered HTML contains no `<mark>` elements
- Highlights are applied only after hydration completes
- No hydration mismatch warnings

### Server Components

The `Highlighter` component is marked `'use client'`. It can wrap Server Component output:

```tsx
// page.tsx (Server Component)
import { Highlighter } from '@markit/react';
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

The options object is shallow-compared to avoid unnecessary effect re-runs.

## Batched Rendering

For pages with large content and thousands of matches, use `batchSize` to keep the UI responsive:

```tsx
const ref = useHighlight(query, {
  renderer: 'dom',
  batchSize: 500,
  done: (count) => {
    setMatchCount(count);  // Safe: called after all batches complete
  },
});
```

Or with the `Highlighter` component:

```tsx
<Highlighter
  term={query}
  renderer="dom"
  batchSize={500}
  done={(count) => setMatchCount(count)}
>
  <article>Long document content...</article>
</Highlighter>
```

### Cleanup safety

When the component unmounts or the term changes, `useHighlight` calls `destroy()` on the instance, which automatically cancels any in-progress batch. This is safe with StrictMode's double-invoke — the cleanup function runs before each re-invocation.

::: tip
`getMatches()` returns all matches immediately (search is synchronous), even while rendering is still in progress. Only the DOM rendering is batched.
:::
