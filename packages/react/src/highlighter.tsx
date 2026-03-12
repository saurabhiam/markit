'use client';

import React, { type ReactNode, useMemo } from 'react';
import type { Key } from 'react';
import { useHighlight, type UseHighlightOptions } from './use-highlight.js';

export interface HighlighterProps extends UseHighlightOptions {
  /** Search term(s) to highlight. */
  term: string | string[];

  /** Content to render and search within. */
  children: ReactNode;

  /**
   * Like useEffect deps: pass value(s) that change when the highlighted content changes
   * to avoid garbled text. Single: contentKey={value}. Multiple: contentKey={[value1, value2]}.
   * Omit for static content.
   */
  contentKey?: Key | Key[];

  /** HTML tag for the container element. Default: 'div' */
  as?: keyof React.JSX.IntrinsicElements;

  /** Additional CSS class name for the container. */
  className?: string;

  /** Additional inline styles for the container. */
  style?: React.CSSProperties;
}

/**
 * Declarative React component for text highlighting.
 *
 * Pass a stable term and stable options (e.g. useMemo) for best performance.
 *
 * Wraps children in a container element and applies highlighting
 * based on the search term. Must be a Client Component in Next.js
 * (marked with 'use client' at the top).
 *
 * Hydration-safe: useEffect doesn't run during SSR, so no <mark>
 * elements exist in the server HTML. Highlights are applied only
 * after hydration completes.
 *
 * For dynamic content (e.g. state), pass contentKey so React remounts
 * the content when it changes and the highlight re-applies correctly.
 *
 * @example
 * ```tsx
 * <Highlighter term="react" caseSensitive={false}>
 *   <article>
 *     <p>React is a JavaScript library for building user interfaces.</p>
 *   </article>
 * </Highlighter>
 * ```
 */
export function Highlighter({
  term,
  children,
  contentKey,
  as: Tag = 'div',
  className,
  style,
  ...options
}: HighlighterProps) {
  /* Memoize so we don't pass a new object every render. useHighlight shallow-compares
   *options internally, so listing every key here isn't required; options reference is enough.
   */
  const optionsForHighlight = useMemo(() => ({ ...options, contentKey }), [contentKey, options]);
  const ref = useHighlight(term, optionsForHighlight);

  const fragmentKey =
    contentKey === undefined
      ? undefined
      : Array.isArray(contentKey)
        ? JSON.stringify(contentKey)
        : contentKey;

  if (fragmentKey === undefined) {
    return React.createElement(Tag as string, { ref, className, style }, children);
  }

  // Use a wrapper div with key so React unmounts the entire subtree (including any <mark> nodes we added)
  // and mounts fresh content. Fragment would leave our DOM mutations behind.
  return React.createElement(
    Tag as string,
    { ref, className, style },
    React.createElement('div', { key: fragmentKey }, children),
  );
}
