import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarkitHighlightDirective } from '../src/lib/highlight.directive';

/**
 * Tests for the Angular directive without TestBed.
 *
 * We directly instantiate the directive class with mocked Angular
 * primitives (ElementRef, NgZone). This tests the directive's logic
 * without requiring the Angular compiler, which keeps tests fast
 * and avoids the @analogjs/vite-plugin-angular dependency.
 *
 * Template rendering and data binding are Angular framework concerns --
 * what we're validating here is:
 *   - The highlight engine is invoked correctly
 *   - NgZone boundaries are respected
 *   - Cleanup happens on destroy
 *   - Callbacks re-enter the zone
 */

function createMockNgZone() {
  return {
    run: vi.fn((fn: Function) => fn()),
    runOutsideAngular: vi.fn((fn: Function) => fn()),
  };
}

function createMockElementRef(element: HTMLElement) {
  return { nativeElement: element };
}

describe('MarkitHighlightDirective', () => {
  let container: HTMLElement;
  let directive: MarkitHighlightDirective;
  let mockZone: ReturnType<typeof createMockNgZone>;

  beforeEach(() => {
    container = document.createElement('div');
    container.innerHTML = '<p>hello world hello again</p>';
    document.body.appendChild(container);

    mockZone = createMockNgZone();
    directive = new MarkitHighlightDirective(
      createMockElementRef(container) as any,
      mockZone as any,
    );
    directive.markitOptions = { renderer: 'dom' };
  });

  afterEach(() => {
    directive.ngOnDestroy();
    document.body.removeChild(container);
  });

  it('applies highlights when searchTerm is set', () => {
    directive.searchTerm = 'hello';
    directive.ngOnChanges({
      searchTerm: {
        currentValue: 'hello',
        previousValue: '',
        firstChange: true,
        isFirstChange: () => true,
      },
    } as any);

    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(2);
    expect(marks[0]!.textContent).toBe('hello');
  });

  it('clears highlights when searchTerm changes to empty', () => {
    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);
    expect(container.querySelectorAll('mark').length).toBe(2);

    directive.searchTerm = '';
    directive.ngOnChanges({ searchTerm: {} } as any);
    expect(container.querySelectorAll('mark').length).toBe(0);
  });

  it('updates highlights when searchTerm changes', () => {
    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);
    expect(container.querySelectorAll('mark').length).toBe(2);

    directive.searchTerm = 'world';
    directive.ngOnChanges({ searchTerm: {} } as any);
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]!.textContent).toBe('world');
  });

  it('handles array of search terms', () => {
    directive.searchTerm = ['hello', 'world'];
    directive.ngOnChanges({ searchTerm: {} } as any);

    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(3);
  });

  it('calls done callback with match count', () => {
    const done = vi.fn();
    directive.markitOptions = { renderer: 'dom', done };
    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);

    expect(done).toHaveBeenCalledWith(2);
  });

  it('calls noMatch callback when no results found', () => {
    const noMatch = vi.fn();
    directive.markitOptions = { renderer: 'dom', noMatch };
    directive.searchTerm = 'nonexistent';
    directive.ngOnChanges({ searchTerm: {} } as any);

    expect(noMatch).toHaveBeenCalled();
  });

  it('re-enters NgZone for done callback', () => {
    const done = vi.fn();
    directive.markitOptions = { renderer: 'dom', done };
    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);

    expect(mockZone.run).toHaveBeenCalled();
  });

  it('re-enters NgZone for noMatch callback', () => {
    const noMatch = vi.fn();
    directive.markitOptions = { renderer: 'dom', noMatch };
    directive.searchTerm = 'nonexistent';
    directive.ngOnChanges({ searchTerm: {} } as any);

    expect(mockZone.run).toHaveBeenCalled();
  });

  it('runs highlighting outside NgZone', () => {
    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);

    expect(mockZone.runOutsideAngular).toHaveBeenCalled();
  });

  it('cleans up on destroy', () => {
    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);
    expect(container.querySelectorAll('mark').length).toBe(2);

    directive.ngOnDestroy();
    expect(container.querySelectorAll('mark').length).toBe(0);
  });

  it('cleans up outside NgZone on destroy', () => {
    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);

    mockZone.runOutsideAngular.mockClear();
    directive.ngOnDestroy();

    expect(mockZone.runOutsideAngular).toHaveBeenCalled();
  });

  it('preserves element structure after highlight', () => {
    const button = document.createElement('button');
    button.textContent = 'Click hello here';
    let clicked = false;
    button.addEventListener('click', () => {
      clicked = true;
    });
    container.appendChild(button);

    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);

    button.click();
    expect(clicked).toBe(true);
    expect(container.querySelector('button')).toBeTruthy();
  });

  it('preserves text content after highlight and clear cycle', () => {
    const originalText = container.textContent;

    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);

    directive.searchTerm = '';
    directive.ngOnChanges({ searchTerm: {} } as any);

    expect(container.textContent).toBe(originalText);
  });

  it('handles multiple rapid changes', () => {
    directive.searchTerm = 'hello';
    directive.ngOnChanges({ searchTerm: {} } as any);
    directive.searchTerm = 'world';
    directive.ngOnChanges({ searchTerm: {} } as any);
    directive.searchTerm = 'again';
    directive.ngOnChanges({ searchTerm: {} } as any);

    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]!.textContent).toBe('again');
  });

  it('when markitContentKey changes: unmarks then re-applies after view update (no garbled text)', () => {
    const p = container.querySelector('p')!;
    p.textContent = 'Hello';
    directive.searchTerm = 'o';
    directive.markitContentKey = 'Hello';
    directive.ngOnChanges({
      searchTerm: {
        currentValue: 'o',
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    } as any);
    expect(p.textContent).toContain('Hello');
    expect(container.querySelectorAll('mark').length).toBeGreaterThan(0);

    // Simulate signal update: content key and host content change to "World"
    directive.markitContentKey = 'World';
    p.textContent = 'World';
    directive.ngOnChanges({
      markitContentKey: {
        currentValue: 'World',
        previousValue: 'Hello',
        firstChange: false,
        isFirstChange: () => false,
      },
    } as any);
    directive.ngAfterViewChecked();

    expect(p.textContent).toBe('World');
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]!.textContent).toBe('o');
  });

  it('without markitContentKey content is static: only ngOnChanges triggers apply, not content changes', () => {
    const p = container.querySelector('p')!;
    p.textContent = 'Hello';
    directive.searchTerm = 'o';
    directive.markitOptions = { renderer: 'dom' };
    directive.ngOnChanges({ searchTerm: {} } as any);
    expect(container.querySelectorAll('mark').length).toBeGreaterThan(0);

    // Simulate host content changing (e.g. bound value changed) without passing markitContentKey.
    // Content is treated as static — we do not run cleanup or re-apply, so we do not fix garbled state.
    p.textContent = 'World';
    directive.ngAfterViewChecked(); // No re-apply when markitContentKey is undefined.

    expect(p.textContent).toBe('World');
    // Marks were removed when we set textContent; we did not re-apply (static).
    expect(container.querySelectorAll('mark').length).toBe(0);
  });

  it('supports multiple keys in markitContentKey: re-applies when any key in the array changes', () => {
    const p = container.querySelector('p')!;
    p.textContent = 'Hello';
    directive.searchTerm = 'o';
    directive.markitContentKey = ['Hello', 'v1'];
    directive.ngOnChanges({
      searchTerm: {
        currentValue: 'o',
        previousValue: undefined,
        firstChange: true,
        isFirstChange: () => true,
      },
    } as any);
    expect(container.querySelectorAll('mark').length).toBeGreaterThan(0);

    // Change one key in the array
    directive.markitContentKey = ['World', 'v1'];
    p.textContent = 'World';
    directive.ngOnChanges({
      markitContentKey: {
        currentValue: ['World', 'v1'],
        previousValue: ['Hello', 'v1'],
        firstChange: false,
        isFirstChange: () => false,
      },
    } as any);
    directive.ngAfterViewChecked();

    expect(p.textContent).toBe('World');
    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(1);
    expect(marks[0]!.textContent).toBe('o');
  });
});
