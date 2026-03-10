# Getting Started

MarkIt is a high-performance text highlighting library for the modern web. It replicates all features of mark.js while being faster, framework-safe, and built on modern browser APIs.

## Installation

::: code-group

```bash [npm]
npm install @markitjs/core
```

```bash [bun]
bun add @markitjs/core
```

```bash [pnpm]
pnpm add @markitjs/core
```

:::

For framework-specific wrappers:

**React / Next.js**

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

:::

**Angular**

::: code-group

```bash [npm]
npm install @markitjs/angular
```

```bash [bun]
bun add @markitjs/angular
```

```bash [pnpm]
pnpm add @markitjs/angular
```

:::

## Quick Start (Vanilla JS)

```typescript
import { markit } from '@markitjs/core';

const container = document.getElementById('content');
const instance = markit(container);

// Highlight keywords
instance.mark('search term');

// Highlight with regex
instance.markRegExp(/\d{3}-\d{4}/g);

// Highlight specific ranges
instance.markRanges([{ start: 10, length: 5 }]);

// Remove highlights
instance.unmark();

// Clean up
instance.destroy();
```

## How It Works

MarkIt uses a **dual-engine architecture**:

1. **CSS Custom Highlight API** (default) — Creates `Range` objects and registers them with the browser's highlight registry. Styled via `::highlight()`. Zero DOM mutations. Supported in Chrome 105+, Edge 105+, Safari 17.2+, Firefox 140+; unsupported browsers fall back to the DOM renderer with `renderer: 'auto'`.

2. **DOM Range Renderer** (fallback) — Splits text nodes and wraps matches in `<mark>` elements using the Range API. Never uses `innerHTML`.

The engine is selected automatically via feature detection, or you can force one:

```typescript
instance.mark('term', { renderer: 'highlight-api' }); // Force Highlight API
instance.mark('term', { renderer: 'dom' }); // Force DOM wrapping
instance.mark('term', { renderer: 'overlay' }); // Force overlay positioning
instance.mark('term', { renderer: 'auto' }); // Auto-detect (default)
```

**How `auto` works:** When `renderer` is `'auto'` (the default), MarkIt checks at runtime whether the CSS Custom Highlight API is available (`CSS` and `CSS.highlights`). If yes, it uses the Highlight API renderer (zero DOM mutations). If not — for example in older browsers or in Node (e.g. jsdom) — it uses the DOM wrapping renderer. The chosen renderer is reused for the lifetime of that instance until you call with a different `renderer` or destroy it.

## Styling Highlights

### CSS Custom Highlight API

```css
::highlight(markit-highlight) {
  background-color: #ffff00;
  color: #000;
}
```

### DOM Renderer

```css
mark.markit-match {
  background-color: #ffff00;
  color: #000;
}
```

## Next Steps

- [Core API Reference](/guide/core-api) — Full options and methods
- [Angular Integration](/guide/angular) — Directive and service usage
- [React Integration](/guide/react) — Hook and component usage
- [Performance Guide](/guide/performance) — Optimization strategies
