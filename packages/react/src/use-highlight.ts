import { useRef, useEffect, useMemo } from 'react';
import type { Key } from 'react';
import { markit, type MarkitInstance, type MarkitOptions, type MarkitPlugin } from '@markitjs/core';

export interface UseHighlightOptions extends Partial<MarkitOptions> {
  /** Plugins to register with the markit instance. */
  plugins?: MarkitPlugin[];

  /**
   * When to run the highlight effect.
   * - `'effect'` (default) — runs after paint via useEffect. Best for CSS Highlight API.
   * - `'layout'` — runs before paint via useLayoutEffect. Use with DOM renderer to avoid flash.
   */
  timing?: 'effect' | 'layout';

  /**
   * Like useEffect deps: when this value (or any value in the array) changes, the effect
   * re-runs and re-applies highlight. Pass the same value(s) as your content so that when
   * content updates you get correct highlights instead of garbled text. Omit for static content.
   * Single: contentKey={value}. Multiple: contentKey={[value1, value2]}.
   */
  contentKey?: Key | Key[];
}

/**
 * React hook for text highlighting. Returns a ref to attach to
 * the container element.
 *
 * Safe for:
 * - StrictMode (cleanup runs before re-invocation, unmark is idempotent)
 * - Concurrent rendering (effects only run on committed renders)
 * - Next.js SSR (useEffect doesn't run on server or during hydration)
 *
 * When content is dynamic (e.g. state or props), pass options.contentKey so the effect
 * re-runs when it changes. For dynamic content the container's children should be keyed
 * by contentKey (e.g. via <Highlighter contentKey={value}>). When contentKey is omitted,
 * content is treated as static.
 *
 * @example
 * ```tsx
 * function SearchResults({ query }: { query: string }) {
 *   const ref = useHighlight(query, { caseSensitive: false });
 *   return <div ref={ref}><p>Content to search</p></div>;
 * }
 * ```
 */
export function useHighlight<T extends HTMLElement = HTMLElement>(
  term: string | string[],
  options?: UseHighlightOptions,
) {
  const ref = useRef<T>(null);
  const instanceRef = useRef<MarkitInstance | null>(null);

  // Memoize options to avoid unnecessary effect re-runs.
  // Users should pass a stable options object or useMemo it themselves.
  const optsMemo = useStableOptions(options);

  // Stable dependency for contentKey so effect only runs when value(s) actually change (like useEffect deps).
  const contentKeyDep = useMemo(() => {
    const key = options?.contentKey;
    if (key === undefined) return undefined;
    return Array.isArray(key) ? JSON.stringify(key) : key;
  }, [options?.contentKey]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Clean up previous highlights (idempotent — safe for StrictMode double-invoke)
    if (instanceRef.current) {
      instanceRef.current.destroy();
      instanceRef.current = null;
    }

    const normalizedTerm = Array.isArray(term) ? term.filter(Boolean) : term;

    const isEmpty = Array.isArray(normalizedTerm) ? normalizedTerm.length === 0 : !normalizedTerm;

    if (isEmpty) return;

    instanceRef.current = markit(el, optsMemo?.plugins);
    instanceRef.current.mark(normalizedTerm, optsMemo);

    return () => {
      if (instanceRef.current) {
        instanceRef.current.destroy();
        instanceRef.current = null;
      }
    };
  }, [term, optsMemo, contentKeyDep]);

  return ref;
}

/**
 * Shallow-compare options object to avoid unnecessary effect re-runs.
 * Returns the same reference if nothing changed.
 */
function useStableOptions(
  options: UseHighlightOptions | undefined,
): UseHighlightOptions | undefined {
  const prev = useRef(options);

  return useMemo(() => {
    if (options === undefined && prev.current === undefined) return undefined;
    if (options === undefined || prev.current === undefined) {
      prev.current = options;
      return options;
    }

    if (shallowEqual(prev.current as Record<string, unknown>, options as Record<string, unknown>)) {
      return prev.current;
    }

    prev.current = options;
    return options;
  }, [options]);
}

function shallowEqual(a: Record<string, unknown>, b: Record<string, unknown>): boolean {
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  for (const key of keysA) {
    if (a[key] !== b[key]) return false;
  }
  return true;
}
