import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MarkitService } from '../src/lib/highlight.service';

function createMockNgZone() {
  return {
    run: vi.fn((fn: Function) => fn()),
    runOutsideAngular: vi.fn((fn: Function) => fn()),
  };
}

describe('MarkitService', () => {
  let service: MarkitService;
  let container: HTMLElement;
  let mockZone: ReturnType<typeof createMockNgZone>;

  beforeEach(() => {
    mockZone = createMockNgZone();
    service = new MarkitService(mockZone as any);

    container = document.createElement('div');
    container.innerHTML = '<p>hello world hello again</p>';
    document.body.appendChild(container);
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  it('creates a markit instance', () => {
    const instance = service.create(container);
    expect(instance).toBeTruthy();
    expect(typeof instance.mark).toBe('function');
    expect(typeof instance.unmark).toBe('function');
    expect(typeof instance.destroy).toBe('function');
    instance.destroy();
  });

  it('creates instance outside NgZone', () => {
    service.create(container);
    expect(mockZone.runOutsideAngular).toHaveBeenCalled();
  });

  it('highlights text via service', () => {
    const instance = service.create(container);
    service.highlight(instance, 'hello', { renderer: 'dom' });

    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(2);
    expect(marks[0]!.textContent).toBe('hello');

    instance.destroy();
  });

  it('highlights with regex via service', () => {
    const instance = service.create(container);
    service.highlightRegExp(instance, /hello/g, { renderer: 'dom' });

    const marks = container.querySelectorAll('mark');
    expect(marks.length).toBe(2);

    instance.destroy();
  });

  it('clears highlights via service', () => {
    const instance = service.create(container);
    service.highlight(instance, 'hello', { renderer: 'dom' });
    expect(container.querySelectorAll('mark').length).toBe(2);

    service.clear(instance);
    expect(container.querySelectorAll('mark').length).toBe(0);

    instance.destroy();
  });

  it('runs highlight outside NgZone', () => {
    const instance = service.create(container);
    mockZone.runOutsideAngular.mockClear();

    service.highlight(instance, 'hello', { renderer: 'dom' });
    expect(mockZone.runOutsideAngular).toHaveBeenCalled();

    instance.destroy();
  });

  it('runs highlightRegExp outside NgZone', () => {
    const instance = service.create(container);
    mockZone.runOutsideAngular.mockClear();

    service.highlightRegExp(instance, /hello/g, { renderer: 'dom' });
    expect(mockZone.runOutsideAngular).toHaveBeenCalled();

    instance.destroy();
  });

  it('runs clear outside NgZone', () => {
    const instance = service.create(container);
    service.highlight(instance, 'hello', { renderer: 'dom' });
    mockZone.runOutsideAngular.mockClear();

    service.clear(instance);
    expect(mockZone.runOutsideAngular).toHaveBeenCalled();

    instance.destroy();
  });

  it('preserves text content after highlight and clear cycle', () => {
    const originalText = container.textContent;

    const instance = service.create(container);
    service.highlight(instance, 'hello', { renderer: 'dom' });
    service.clear(instance);

    expect(container.textContent).toBe(originalText);

    instance.destroy();
  });
});
