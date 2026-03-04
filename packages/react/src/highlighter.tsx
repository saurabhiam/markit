'use client';

import React, { type ReactNode } from 'react';
import { useHighlight, type UseHighlightOptions } from './use-highlight.js';

export interface HighlighterProps extends UseHighlightOptions {
  /** Search term(s) to highlight. */
  term: string | string[];

  /** Content to render and search within. */
  children: ReactNode;

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
 * Wraps children in a container element and applies highlighting
 * based on the search term. Must be a Client Component in Next.js
 * (marked with 'use client' at the top).
 *
 * Hydration-safe: useEffect doesn't run during SSR, so no <mark>
 * elements exist in the server HTML. Highlights are applied only
 * after hydration completes.
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
  as: Tag = 'div',
  className,
  style,
  ...options
}: HighlighterProps) {
  const ref = useHighlight(term, options);

  return React.createElement(
    Tag as string,
    { ref, className, style },
    children,
  );
}
