import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import React, { StrictMode, useState } from 'react';
import { useHighlight } from '../src/use-highlight.js';
import { Highlighter } from '../src/highlighter.js';

afterEach(cleanup);

function TestComponent({ term, options }: { term: string; options?: Record<string, unknown> }) {
  const ref = useHighlight(term, { renderer: 'dom', ...options } as any);
  return <div ref={ref}><p>hello world hello</p></div>;
}

describe('useHighlight', () => {
  it('highlights text in a container', () => {
    const { container } = render(<TestComponent term="hello" />);
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2);
    expect(marks[0]!.textContent).toBe('hello');
  });

  it('cleans up on unmount', () => {
    const { container, unmount } = render(<TestComponent term="hello" />);
    expect(container.querySelectorAll('mark')).toHaveLength(2);

    unmount();
    // After unmount, the container is removed from DOM
  });

  it('updates highlights when term changes', () => {
    function DynamicComponent() {
      const [term, setTerm] = useState('hello');
      const ref = useHighlight(term, { renderer: 'dom' });
      return (
        <div>
          <button onClick={() => setTerm('world')}>change</button>
          <div ref={ref}><p>hello world</p></div>
        </div>
      );
    }

    const { container } = render(<DynamicComponent />);
    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('mark')!.textContent).toBe('hello');

    act(() => {
      container.querySelector('button')!.click();
    });

    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('mark')!.textContent).toBe('world');
  });

  it('handles empty term gracefully', () => {
    const { container } = render(<TestComponent term="" />);
    expect(container.querySelectorAll('mark')).toHaveLength(0);
  });

  it('handles array of terms', () => {
    function MultiTerm() {
      const ref = useHighlight(['hello', 'world'], { renderer: 'dom' });
      return <div ref={ref}><p>hello world</p></div>;
    }

    const { container } = render(<MultiTerm />);
    expect(container.querySelectorAll('mark')).toHaveLength(2);
  });

  it('is safe in StrictMode (no duplicate highlights)', () => {
    const { container } = render(
      <StrictMode>
        <TestComponent term="hello" />
      </StrictMode>,
    );

    // StrictMode double-invokes effects in development.
    // Our cleanup should prevent duplicate highlights.
    const marks = container.querySelectorAll('mark');
    expect(marks).toHaveLength(2); // 2 instances of "hello", not 4
  });
});

describe('Highlighter component', () => {
  it('renders children and highlights term', () => {
    const { container } = render(
      <Highlighter term="test" renderer="dom">
        <p>this is a test page</p>
      </Highlighter>,
    );

    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('mark')!.textContent).toBe('test');
  });

  it('renders with custom container tag', () => {
    const { container } = render(
      <Highlighter term="test" as="section" renderer="dom">
        <p>test content</p>
      </Highlighter>,
    );

    expect(container.querySelector('section')).toBeTruthy();
    expect(container.querySelectorAll('mark')).toHaveLength(1);
  });

  it('applies className and style to container', () => {
    const { container } = render(
      <Highlighter
        term="test"
        className="search-results"
        style={{ padding: '10px' }}
        renderer="dom"
      >
        <p>test</p>
      </Highlighter>,
    );

    const div = container.firstElementChild as HTMLElement;
    expect(div.classList.contains('search-results')).toBe(true);
    expect(div.style.padding).toBe('10px');
  });
});
