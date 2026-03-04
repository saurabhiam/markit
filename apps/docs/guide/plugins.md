# Plugins

MarkIt's plugin system provides hooks at each stage of the highlight pipeline.

## Plugin Interface

```typescript
interface MarkitPlugin {
  name: string;
  beforeSearch?: (term: string, options: MarkitOptions) => string;
  afterMatch?: (matches: MatchResult[], options: MarkitOptions) => MatchResult[];
  beforeRender?: (matches: ResolvedMatch[], options: MarkitOptions) => void;
  afterRender?: (matchCount: number, options: MarkitOptions) => void;
}
```

## Lifecycle

```
mark("hello")
  → plugin.beforeSearch("hello")     // Can transform the search term
  → search engine finds matches
  → plugin.afterMatch(matches)        // Can filter/modify matches
  → resolve matches to DOM nodes
  → plugin.beforeRender(resolved)     // Pre-render hook
  → renderer.render()
  → plugin.afterRender(count)         // Post-render hook
```

## Example: Match Limiter

Limit the number of highlights to prevent performance issues on huge pages:

```typescript
const matchLimiter: MarkitPlugin = {
  name: 'match-limiter',
  afterMatch: (matches, options) => {
    return matches.slice(0, 100); // Max 100 highlights
  },
};

const instance = markit(container, [matchLimiter]);
```

## Example: Search Analytics

Track search patterns:

```typescript
const analytics: MarkitPlugin = {
  name: 'analytics',
  afterRender: (matchCount, options) => {
    trackEvent('search_highlight', {
      matchCount,
      renderer: options.renderer,
    });
  },
};
```

## Example: Term Preprocessor

Normalize search terms before matching:

```typescript
const normalizer: MarkitPlugin = {
  name: 'normalizer',
  beforeSearch: (term) => {
    return term.trim().toLowerCase();
  },
};
```

## Registering Plugins

### Vanilla JS

```typescript
const instance = markit(container, [plugin1, plugin2]);
```

### React

```tsx
const ref = useHighlight(term, { plugins: [plugin1, plugin2] });
```

### Angular

```html
<div [markitHighlight]="term" [markitPlugins]="[plugin1, plugin2]"></div>
```
