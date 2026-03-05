---
'@markitjs/angular': major
'@markitjs/core': major
'@markitjs/react': major
---

**High-performance text highlighting for the modern web.**

This is the first public release of MarkIt: a production-ready alternative to mark.js, built for **Angular**, **React**, **Next.js**, and vanilla JavaScript.

| Package               | Description                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------------- |
| **@markitjs/core**    | Framework-agnostic highlighting engine with dual rendering (CSS Highlight API + DOM wrapping) |
| **@markitjs/react**   | React hook `useHighlight` and optional `<Highlighter>` component; SSR- and hydration-safe     |
| **@markitjs/angular** | `markitHighlight` directive and `MarkitService`; works with OnPush, Signals, and zoneless     |

- **Performance** — Built to match Chrome's Find in Page: TreeWalker indexing, binary-search offset resolution, and optional zero-DOM-mutation rendering via the CSS Custom Highlight API.
- **Framework-safe** — No `innerHTML`; uses the Range API so Angular bindings, React reconciliation, and event listeners stay intact.
- \*re set\*\* — Keywords, regex, diacritics, synonyms, wildcards, accuracy modes, across-elements matching, exclude selectors, and a plugin system (`beforeSearch`, `afterMatch`, `beforeRender`, `afterRender`).
- **Small and tree-shakeable** — ESM + CJS, `sideEffects: false`.

```bash
npm install @markitjs/core

npm install @markitjs/react

npm install @markitjs/core @markitjs/angular

```
