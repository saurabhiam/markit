# Getting Started

MarkIt is a high-performance text highlighting library for the modern web. It replicates all features of mark.js while being faster, framework-safe, and built on modern browser APIs.

## Installation

::: code-group

```bash [npm]
npm install @markit/core
```

```bash [bun]
bun add @markit/core
```

```bash [pnpm]
pnpm add @markit/core
```

:::

For framework-specific wrappers:

```bash
# React / Next.js
npm install @markit/react

# Angular
npm install @markit/angular
```

## Quick Start (Vanilla JS)

```typescript
import { markit } from '@markit/core';

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

1. **CSS Custom Highlight API** (default) — Creates `Range` objects and registers them with the browser's highlight registry. Styled via `::highlight()`. Zero DOM mutations.

2. **DOM Range Renderer** (fallback) — Splits text nodes and wraps matches in `<mark>` elements using the Range API. Never uses `innerHTML`.

The engine is selected automatically via feature detection, or you can force one:

```typescript
instance.mark('term', { renderer: 'highlight-api' }); // Force Highlight API
instance.mark('term', { renderer: 'dom' });            // Force DOM wrapping
instance.mark('term', { renderer: 'overlay' });        // Force overlay positioning
instance.mark('term', { renderer: 'auto' });           // Auto-detect (default)
```

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
