# MarkIt

High-performance text highlighting for the modern web. A production-grade alternative to mark.js — built for Angular, React, Next.js, and vanilla JavaScript.

## Why MarkIt?

- **Fast** — Designed to rival Chrome's native Find in Page. Uses `TreeWalker` for O(n) traversal, binary search for match resolution, and zero-layout-cost rendering via the CSS Custom Highlight API.
- **Framework-safe** — Never uses `innerHTML`. Preserves Angular bindings, React reconciliation, event listeners, and component trees.
- **Three rendering engines** — CSS Highlight API (zero DOM mutations), DOM wrapping (Range API + text node splitting), and overlay positioning. Auto-detects the best engine for your browser.
- **Batched rendering** — For very large DOMs (50K+ nodes), split rendering across animation frames with `batchSize` to keep the UI responsive.
- **Full-featured** — Regex, multiple keywords, case sensitivity, diacritics, synonyms, wildcards, accuracy modes, exclude selectors, across-elements matching, and more.
- **Tiny & tree-shakeable** — ESM and CJS builds with `sideEffects: false`.

## Packages

| Package                               | Description                                               | Version                                                                                                   |
| ------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| [@markitjs/core](packages/core)       | Framework-agnostic highlighting engine                    | [![npm](https://img.shields.io/npm/v/@markitjs/core)](https://www.npmjs.com/package/@markitjs/core)       |
| [@markitjs/react](packages/react)     | React hook (`useHighlight`) and `<Highlighter>` component | [![npm](https://img.shields.io/npm/v/@markitjs/react)](https://www.npmjs.com/package/@markitjs/react)     |
| [@markitjs/angular](packages/angular) | Angular directive (`markitHighlight`) and `MarkitService` | [![npm](https://img.shields.io/npm/v/@markitjs/angular)](https://www.npmjs.com/package/@markitjs/angular) |

## Quick Start

### Vanilla JavaScript

```bash
# npm
npm install @markitjs/core
# bun
bun add @markitjs/core
# pnpm
pnpm add @markitjs/core
```

```typescript
import { markit } from '@markitjs/core';

const instance = markit(document.getElementById('content'));
instance.mark('search term', { renderer: 'auto' });

// Later...
instance.destroy();
```

### React / Next.js

```bash
# npm
npm install @markitjs/react
# bun
bun add @markitjs/react
# pnpm
pnpm add @markitjs/react
# yarn (install @markitjs/core explicitly)
yarn add @markitjs/react @markitjs/core
```

With Yarn, install peer dependency `@markitjs/core` explicitly (see commands above).

```tsx
'use client';

import { useHighlight } from '@markitjs/react';

function SearchResults({ query }: { query: string }) {
  const ref = useHighlight(query, { caseSensitive: false });
  return (
    <div ref={ref}>
      <p>Content to search...</p>
    </div>
  );
}
```

Next.js App Router: add `"use client"` at the top of any file that uses the hook or `<Highlighter>`. SSR-safe — no hydration mismatch. For dynamic content, pass `contentKey` so highlights re-apply when content changes (see [Framework lifecycles](apps/docs/guide/framework-lifecycles.md)).

### Angular

```bash
# npm
npm install @markitjs/angular
# bun
bun add @markitjs/angular
# pnpm
pnpm add @markitjs/angular
# yarn (install @markitjs/core explicitly)
yarn add @markitjs/angular @markitjs/core
```

With Yarn, install peer dependency `@markitjs/core` explicitly (see commands above).

```typescript
import { MarkitHighlightDirective } from '@markitjs/angular';

@Component({
  standalone: true,
  imports: [MarkitHighlightDirective],
  template: `
    <div [markitHighlight]="searchTerm" [markitOptions]="{ renderer: 'dom' }">
      <p>Content to search...</p>
    </div>
  `,
})
export class SearchComponent {
  searchTerm = '';
}
```

Runs outside NgZone. Compatible with OnPush, Signals, and zoneless apps. For dynamic content, pass `[markitContentKey]` so the directive re-applies highlights after content updates (see [Framework lifecycles](apps/docs/guide/framework-lifecycles.md)).

## Rendering Engines

| Engine                                  | DOM Mutations  | Reflows          | Best For                                         |
| --------------------------------------- | -------------- | ---------------- | ------------------------------------------------ |
| **CSS Highlight API** (`highlight-api`) | 0              | 0                | Default. Fastest. Framework-safe.                |
| **DOM Wrapping** (`dom`)                | Per match      | Batched          | When you need click handlers on highlights       |
| **Overlay** (`overlay`)                 | Container only | On scroll/resize | Maximum framework isolation                      |
| **Auto** (`auto`)                       | —              | —                | Feature-detects Highlight API, falls back to DOM |

## Key Options

| Option               | Type                                                          | Default       | Description                                    |
| -------------------- | ------------------------------------------------------------- | ------------- | ---------------------------------------------- |
| `renderer`           | `'auto'`, `'highlight-api'`, `'dom'`, `'overlay'`             | `'auto'`      | Rendering strategy                             |
| `caseSensitive`      | `boolean`                                                     | `false`       | Case-sensitive matching                        |
| `ignoreDiacritics`   | `boolean`                                                     | `false`       | Strip diacritics (café → cafe)                 |
| `accuracy`           | `'partially'`, `'exactly'`, `'startsWith'`, `'complementary'` | `'partially'` | Match accuracy mode                            |
| `separateWordSearch` | `boolean`                                                     | `false`       | Split term into individual words               |
| `acrossElements`     | `boolean`                                                     | `false`       | Match across element boundaries                |
| `synonyms`           | `SynonymMap`                                                  | —             | Synonym expansion (`{ "JS": ["JavaScript"] }`) |
| `wildcards`          | `'disabled'`, `'enabled'`, `'withSpaces'`                     | `'disabled'`  | Wildcard `?` and `*` support                   |
| `exclude`            | `string[]`                                                    | —             | CSS selectors to skip                          |
| `batchSize`          | `number`                                                      | `0`           | Async batch rendering (0 = synchronous)        |
| `debounce`           | `number`                                                      | `0`           | Debounce delay in ms for live search           |
| `debug`              | `boolean`                                                     | `false`       | Log timing to console                          |

See the [full API reference](apps/docs/guide/core-api.md) for all options and callbacks.

## Monorepo Structure

```
markit/
├── packages/
│   ├── core/          @markitjs/core — highlighting engine
│   ├── react/         @markitjs/react — React hook & component
│   └── angular/       @markitjs/angular — Angular directive & service
├── apps/
│   ├── docs/          VitePress documentation site + playground
│   └── e2e-bench/     Playwright real-browser performance benchmarks
├── turbo.json         Turborepo task configuration
├── tsconfig.base.json Shared TypeScript config
└── package.json       Root workspace config (Bun)
```

## Development

### Prerequisites

- [Bun](https://bun.sh/) >= 1.3 (package manager & script runner)
- [Node.js](https://nodejs.org/) >= 20 (required by Angular build tooling)

### Setup

```bash
git clone https://github.com/saurabhiam/markit.git && cd markit
bun install
```

### Commands

| Command              | Description                                |
| -------------------- | ------------------------------------------ |
| `bun run build`      | Build all packages                         |
| `bun run test`       | Run all unit/integration tests (Vitest)    |
| `bun run typecheck`  | TypeScript type checking                   |
| `bun run dev`        | Dev mode with watch                        |
| `bun run docs:dev`   | Start documentation dev server             |
| `bun run docs:build` | Build documentation site                   |
| `bun run e2e`        | Run Playwright smoke tests (1K nodes; CI)  |
| `bun run bench`      | Run full Playwright performance benchmarks |
| `bun run clean`      | Clean all build artifacts                  |

**Documentation:** [Framework lifecycles](apps/docs/guide/framework-lifecycles.md) — how React and Angular bindings run and re-apply highlights over time.

### Testing

**Unit & integration tests** (127 tests across core, angular, react):

```bash
bun run test
```

**Real-browser performance benchmarks** (Playwright + Chromium):

- **Smoke tests** (1K nodes, used in CI): `bun run e2e`
- **Full suite** (1K–100K nodes): `bun run bench`

```bash
bun run bench
```

### Architecture

The core engine follows a pipeline:

1. **Text Index** — `TreeWalker` builds a flat array of text nodes mapped to a virtual concatenated string
2. **Matcher** — Compiles search terms into an optimized regex, finds matches against the virtual string
3. **Resolver** — Binary search maps virtual string offsets back to DOM text nodes and character offsets
4. **Renderer** — Applies highlights using the selected engine (Highlight API / DOM / Overlay)

Plugin hooks (`beforeSearch`, `afterMatch`, `beforeRender`, `afterRender`) allow interception at each stage. Multiple MarkIt instances can coexist on the same page; with the CSS Highlight API (or `auto`), instances share one `Highlight` per `highlightName`, so they do not overwrite each other.

## Performance

Typical real-browser results (M1 MacBook, Chrome):

| Scenario       | 1K nodes | 10K nodes | 50K nodes |
| -------------- | -------- | --------- | --------- |
| Single keyword | < 5ms    | < 30ms    | < 150ms   |
| 5 keywords     | < 10ms   | < 60ms    | < 300ms   |
| Regex          | < 10ms   | < 50ms    | < 250ms   |
| Unmark         | < 2ms    | < 15ms    | < 80ms    |

## Releasing

MarkIt uses [Changesets](https://github.com/changesets/changesets) with GitHub Actions for automated releases. Packages use **independent versioning** (each has its own version). Releases are keyed by a **release tag** (e.g. `release-2025-03-10-01`); one GitHub Release per release with package tarballs and source zip.

See [RELEASING.md](RELEASING.md) for the full release guide.

## License

[MIT](LICENSE)

---

<p align="right">Made with ♥ in India</p>
