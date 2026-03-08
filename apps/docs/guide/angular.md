# Angular Integration

`@markitjs/angular` provides a standalone directive and injectable service for text highlighting in Angular applications.

## Installation

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

**Peer dependency:** `@markitjs/core` is required; npm 7+, pnpm, and Yarn install it automatically when you add `@markitjs/angular`.

## Directive Usage

The `markitHighlight` attribute directive is the recommended approach for most use cases.

```typescript
import { Component } from '@angular/core';
import { MarkitHighlightDirective } from '@markitjs/angular';

@Component({
  selector: 'app-search-results',
  standalone: true,
  imports: [MarkitHighlightDirective],
  template: `
    <input [(ngModel)]="searchTerm" placeholder="Search..." />
    <div [markitHighlight]="searchTerm" [markitOptions]="highlightOptions">
      <p>This content will be searched and highlighted.</p>
      <app-child-component></app-child-component>
    </div>
  `,
})
export class SearchResultsComponent {
  searchTerm = '';
  highlightOptions = {
    renderer: 'dom' as const,
    caseSensitive: false,
  };
}
```

### Directive Inputs

| Input             | Type                     | Description           |
| ----------------- | ------------------------ | --------------------- |
| `markitHighlight` | `string \| string[]`     | Search term(s)        |
| `markitOptions`   | `Partial<MarkitOptions>` | Configuration options |
| `markitPlugins`   | `MarkitPlugin[]`         | Plugins to register   |

### Callbacks via Options

```typescript
highlightOptions = {
  renderer: 'dom' as const,
  done: (count: number) => {
    this.matchCount = count; // Safe: re-enters NgZone automatically
  },
  noMatch: (term: string) => {
    this.showNoResults = true;
  },
};
```

## Service Usage

For programmatic control, inject `MarkitService`:

```typescript
import { Component, ElementRef, OnDestroy } from '@angular/core';
import { MarkitService } from '@markitjs/angular';
import type { MarkitInstance } from '@markitjs/core';

@Component({
  selector: 'app-document-viewer',
  template: `<div #content><p>Document content here...</p></div>`,
})
export class DocumentViewerComponent implements OnDestroy {
  private highlighter: MarkitInstance | null = null;

  constructor(
    private markitService: MarkitService,
    private el: ElementRef,
  ) {}

  search(term: string) {
    this.highlighter?.destroy();
    this.highlighter = this.markitService.create(this.el.nativeElement);
    this.markitService.highlight(this.highlighter, term, {
      renderer: 'dom',
      caseSensitive: false,
    });
  }

  ngOnDestroy() {
    this.highlighter?.destroy();
  }
}
```

## How It Stays Safe

### NgZone Isolation

All highlighting runs **outside NgZone** via `NgZone.runOutsideAngular()`. This means:

- DOM mutations from the DOM renderer don't trigger change detection
- Range creation for the Highlight API doesn't trigger change detection
- Only explicit callbacks (`done`, `noMatch`) re-enter the zone

### No innerHTML

MarkIt never uses `innerHTML`. The DOM renderer splits text nodes using the Range API and wraps matches with `Range.surroundContents()`. This preserves:

- Angular's internal `LView` references
- Template bindings (`[value]`, `(click)`, `*ngIf`)
- Component tree structure
- Event listeners

### OnPush Compatibility

The directive uses `OnChanges`, which fires correctly with `OnPush` change detection when input bindings change.

### Signal Compatibility

With Angular 17+ signals, use `effect()`:

```typescript
searchTerm = signal('');

effect(() => {
  // Reactive to signal changes
  this.markitService.highlight(this.highlighter, this.searchTerm());
});
```

## Batched Rendering

For large pages with thousands of matches, use `batchSize` to keep the UI responsive. All batch scheduling runs outside NgZone, and the `done` callback re-enters the zone automatically for safe change detection:

```typescript
highlightOptions = {
  renderer: 'dom' as const,
  batchSize: 500,
  done: (count: number) => {
    this.matchCount = count; // Safe: re-enters NgZone
  },
};
```

```html
<div [markitHighlight]="searchTerm" [markitOptions]="highlightOptions">
  <p>Large document content...</p>
</div>
```

With the service:

```typescript
this.markitService.highlight(this.highlighter, term, {
  renderer: 'dom',
  batchSize: 500,
  done: (count) => {
    this.matchCount = count;
  },
});
```

::: tip
`batchSize` uses `requestIdleCallback`/`requestAnimationFrame` internally — both fire outside NgZone since the directive and service run highlighting with `runOutsideAngular()`. This means batched rendering adds **zero change detection overhead**, regardless of how many batches it takes.
:::
