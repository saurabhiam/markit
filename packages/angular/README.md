# @markitjs/angular

Angular bindings for the [@markitjs/core](https://github.com/saurabhiam/markit/tree/main/packages/core) text highlighting engine. Provides a standalone `MarkitHighlightDirective` and an injectable `MarkitService`.

## Install

```bash
npm install @markitjs/angular @markitjs/core
# or
bun add @markitjs/angular @markitjs/core
```

**Peer dependencies:** Angular 17, 18, or 19

## Quick Start

### Directive

Import the standalone directive in your component:

```typescript
import { Component } from '@angular/core';
import { MarkitHighlightDirective } from '@markitjs/angular';

@Component({
  selector: 'app-search',
  standalone: true,
  imports: [MarkitHighlightDirective],
  template: `
    <input [(ngModel)]="searchTerm" placeholder="Search..." />

    <div [markitHighlight]="searchTerm" [markitOptions]="highlightOptions">
      <p>This content will be searched and highlighted.</p>
      <app-child></app-child>
      <!-- bindings preserved -->
    </div>
  `,
})
export class SearchComponent {
  searchTerm = '';
  highlightOptions = { caseSensitive: false, accuracy: 'partially' as const };
}
```

### Service

For programmatic control, inject `MarkitService`:

```typescript
import { Component, ElementRef, OnDestroy, ViewChild } from '@angular/core';
import { MarkitService } from '@markitjs/angular';
import type { MarkitInstance } from '@markitjs/core';

@Component({
  selector: 'app-editor',
  template: `<div #content>Searchable content here.</div>`,
})
export class EditorComponent implements OnDestroy {
  @ViewChild('content', { static: true }) contentRef!: ElementRef<HTMLElement>;

  private instance: MarkitInstance | null = null;

  constructor(private markitService: MarkitService) {}

  search(term: string) {
    this.instance?.destroy();
    this.instance = this.markitService.create(this.contentRef.nativeElement);
    this.markitService.highlight(this.instance, term, {
      renderer: 'dom',
      caseSensitive: false,
    });
  }

  clear() {
    this.markitService.clear(this.instance!);
  }

  ngOnDestroy() {
    this.instance?.destroy();
  }
}
```

## API

### `MarkitHighlightDirective`

Standalone attribute directive. Apply to any element whose text content you want to highlight.

| Input             | Type                     | Description                                           |
| ----------------- | ------------------------ | ----------------------------------------------------- |
| `markitHighlight` | `string \| string[]`     | Search term(s) to highlight                           |
| `markitOptions`   | `Partial<MarkitOptions>` | All `@markitjs/core` options (renderer, accuracy, etc.) |
| `markitPlugins`   | `MarkitPlugin[]`         | Plugins to register                                   |

### `MarkitService`

Injectable service (`providedIn: 'root'`). All operations run outside `NgZone`.

| Method                                        | Description                |
| --------------------------------------------- | -------------------------- |
| `create(element, plugins?)`                   | Create a `MarkitInstance`  |
| `highlight(instance, term, options?)`         | Apply keyword highlighting |
| `highlightRegExp(instance, regexp, options?)` | Apply regex highlighting   |
| `clear(instance)`                             | Remove all highlights      |

## NgZone Safety

Both the directive and service run highlighting **outside NgZone** to avoid triggering unnecessary change detection cycles. This is especially important for DOM-mutating renderers.

Callbacks (`done`, `noMatch`) automatically **re-enter the zone**, so updating component state from callbacks works correctly:

```typescript
highlightOptions = {
  done: (count: number) => {
    this.matchCount = count; // safe — re-enters NgZone automatically
  },
};
```

## Change Detection Compatibility

| Strategy     | Works? | Notes                                                      |
| ------------ | ------ | ---------------------------------------------------------- |
| **Default**  | Yes    | No unnecessary cycles triggered                            |
| **OnPush**   | Yes    | Changes fire via `@Input` bindings through `OnChanges`     |
| **Signals**  | Yes    | Bind a signal in the template; directive reacts via inputs |
| **Zoneless** | Yes    | Operations already run outside zone                        |

## Preserving Bindings

Unlike `innerHTML`-based approaches, MarkIt never replaces DOM nodes. The CSS Highlight API (default) creates **zero DOM mutations**. Even the DOM wrapping renderer only splits text nodes and wraps them — it never destroys component instances, event listeners, or form control state.

## Batched Rendering

For large content areas, enable batched rendering:

```html
<div [markitHighlight]="searchTerm" [markitOptions]="{ batchSize: 500, done: onHighlightDone }">
  <!-- large content -->
</div>
```

## CSS Highlight API Styling

When using the default `auto` renderer on supported browsers, add this to your global styles:

```css
::highlight(markit-highlight) {
  background-color: #fef08a;
  color: inherit;
}
```

## License

MIT
