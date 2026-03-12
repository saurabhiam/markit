import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import React, { StrictMode, useState } from 'react';
import { useHighlight } from '../src/use-highlight.js';
import { Highlighter } from '../src/highlighter.js';

afterEach(cleanup);

function TestComponent({ term, options }: { term: string; options?: Record<string, unknown> }) {
  const ref = useHighlight(term, { renderer: 'dom', ...options } as any);
  return (
    <div ref={ref}>
      <p>hello world hello</p>
    </div>
  );
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
          <div ref={ref}>
            <p>hello world</p>
          </div>
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
      return (
        <div ref={ref}>
          <p>hello world</p>
        </div>
      );
    }

    const { container } = render(<MultiTerm />);
    expect(container.querySelectorAll('mark')).toHaveLength(2);
  });

  it('with timing layout: runs highlight in layout phase (useLayoutEffect)', () => {
    const { container } = render(<TestComponent term="hello" options={{ timing: 'layout' }} />);
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

  it('re-applies when contentKey changes (dynamic content, no garbled text)', () => {
    function DynamicContentComponent() {
      const [text, setText] = useState('Hello');
      const ref = useHighlight('o', { contentKey: text, renderer: 'dom' });
      return (
        <div>
          <button onClick={() => setText('World')}>change</button>
          <div ref={ref}>
            <span key={text}>{text}</span>
          </div>
        </div>
      );
    }

    const { container } = render(<DynamicContentComponent />);
    expect(container.querySelectorAll('mark')).toHaveLength(1);
    expect(container.querySelector('mark')!.textContent).toBe('o');

    act(() => {
      container.querySelector('button')!.click();
    });

    const innerDiv = container.querySelector('mark')?.closest('div');
    expect(innerDiv!.textContent).toBe('World');
    const marks = innerDiv!.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]!.textContent).toBe('o');
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

  it('when contentKey changes: remounts content and re-applies highlight (no garbled text)', () => {
    function WithContentKey() {
      const [title, setTitle] = useState('Hello');
      return (
        <div>
          <button onClick={() => setTitle('World')}>change</button>
          <Highlighter term="o" contentKey={title} renderer="dom">
            {title}
          </Highlighter>
        </div>
      );
    }

    const { container } = render(<WithContentKey />);
    expect(container.querySelectorAll('mark')).toHaveLength(1);

    act(() => {
      container.querySelector('button')!.click();
    });

    const wrapper = container.querySelector('mark')?.closest('div');
    expect(wrapper!.textContent).toBe('World');
    const marks = wrapper!.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]!.textContent).toBe('o');
  });

  it('supports contentKey as array: re-applies when any key changes', () => {
    function WithContentKeyArray() {
      const [a, setA] = useState('Hello');
      const [b, setB] = useState('x');
      return (
        <div>
          <button onClick={() => setA('World')}>change a</button>
          <Highlighter term="o" contentKey={[a, b]} renderer="dom">
            {a} — {b}
          </Highlighter>
        </div>
      );
    }

    const { container } = render(<WithContentKeyArray />);
    expect(container.querySelectorAll('mark')).toHaveLength(1);

    act(() => {
      container.querySelector('button')!.click();
    });

    const wrapper = container.querySelector('mark')?.closest('div');
    expect(wrapper!.textContent).toBe('World — x');
    const marks = wrapper!.querySelectorAll('mark');
    expect(marks).toHaveLength(1);
    expect(marks[0]!.textContent).toBe('o');
  });
});
