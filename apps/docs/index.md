---
layout: home

hero:
  name: 'MarkIt'
  text: 'High-Performance Text Highlighting'
  tagline: As fast as Chrome's Find in Page. Zero DOM mutations by default. Framework-safe.
  actions:
    - theme: brand
      text: Get Started
      link: /guide/getting-started
    - theme: alt
      text: Try the Playground
      link: /playground/

features:
  - title: Dual Engine Architecture
    details: CSS Custom Highlight API for zero DOM mutations, with Range-based DOM wrapping as a fallback. Automatic feature detection picks the best strategy.
  - title: Framework Safe
    details: Designed from the ground up for Angular, React, and Next.js. No innerHTML, no broken bindings, no hydration mismatches.
  - title: Chrome-Level Performance
    details: TreeWalker indexing, binary search offset mapping, incremental search, idle callback batching. Handles 100K+ nodes.
  - title: Full mark.js Feature Parity
    details: Keywords, regex, ranges, diacritics, synonyms, wildcards, accuracy modes, across-elements search, exclude selectors, and more.
  - title: Plugin System
    details: Extensible via beforeSearch, afterMatch, beforeRender, and afterRender hooks. Build fuzzy search, analytics, or custom filters.
  - title: Production Ready
    details: TypeScript-first. ESM + CJS bundles. Tree-shakable. SSR compatible. Thoroughly tested. Published as scoped npm packages.
---
