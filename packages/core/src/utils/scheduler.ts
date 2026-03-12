/**
 * Schedule work in batches using requestIdleCallback (when available)
 * or requestAnimationFrame as fallback. Yields to the main thread
 * between batches to keep the UI responsive.
 *
 * Each batch allocates a slice of the items array; this trades one
 * allocation per batch for a simple callback signature and safe
 * iteration. Callers with very high batch counts could consider
 * a (items, start, end) style API to avoid slice allocations.
 */
export function scheduleBatched<T>(
  items: T[],
  processBatch: (batch: T[]) => void,
  batchSize: number,
  onComplete: () => void,
): () => void {
  let cancelled = false;
  let index = 0;

  const scheduleNext =
    typeof requestIdleCallback !== 'undefined'
      ? (cb: () => void) =>
          requestIdleCallback(() => {
            if (!cancelled) cb();
          })
      : (cb: () => void) =>
          requestAnimationFrame(() => {
            if (!cancelled) cb();
          });

  function processNext(): void {
    if (cancelled || index >= items.length) {
      if (!cancelled) onComplete();
      return;
    }

    const end = Math.min(index + batchSize, items.length);
    const batch = items.slice(index, end);
    processBatch(batch);
    index = end;

    scheduleNext(processNext);
  }

  scheduleNext(processNext);

  return () => {
    cancelled = true;
  };
}

/**
 * Debounce a function call. Returns the debounced function
 * and a cancel handle.
 */
export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delayMs: number,
): { call: (...args: Parameters<T>) => void; cancel: () => void } {
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    call: (...args: Parameters<T>) => {
      if (timer !== null) clearTimeout(timer);
      timer = setTimeout(() => {
        timer = null;
        fn(...args);
      }, delayMs);
    },
    cancel: () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    },
  };
}
