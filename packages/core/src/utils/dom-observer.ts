/**
 * Watches a root element for DOM mutations that would invalidate
 * the text index cache. Debounces to avoid thrashing on rapid updates.
 */
export class DomObserver {
  private observer: MutationObserver | null = null;
  private callback: () => void;
  private debounceTimer: ReturnType<typeof setTimeout> | null = null;
  private debounceMs: number;

  constructor(callback: () => void, debounceMs = 100) {
    this.callback = callback;
    this.debounceMs = debounceMs;
  }

  observe(root: Node): void {
    this.disconnect();

    this.observer = new MutationObserver(() => {
      if (this.debounceTimer !== null) {
        clearTimeout(this.debounceTimer);
      }
      this.debounceTimer = setTimeout(() => {
        this.debounceTimer = null;
        this.callback();
      }, this.debounceMs);
    });

    this.observer.observe(root, {
      childList: true,
      characterData: true,
      subtree: true,
    });
  }

  disconnect(): void {
    if (this.debounceTimer !== null) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}
