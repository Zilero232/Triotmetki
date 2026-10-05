// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';

import { DOM } from '@/shared/config';

import { onDomReady } from '../on-dom-ready';

const setReadyState = (state: DocumentReadyState): void => {
  Object.defineProperty(document, 'readyState', { configurable: true, get: () => state });
};

const fireDomReady = (): void => {
  document.dispatchEvent(new Event(DOM.readyEvent));
};

afterEach(() => {
  Reflect.deleteProperty(document, 'readyState');
});

describe(onDomReady, () => {
  it('runs at once when the document is already parsed', () => {
    const callback = vi.fn();

    setReadyState('interactive');

    onDomReady(callback);

    expect(callback).toHaveBeenCalledOnce();
  });

  it('waits while the document is loading', () => {
    const callback = vi.fn();

    setReadyState('loading');

    onDomReady(callback);

    expect(callback).not.toHaveBeenCalled();
  });

  it('runs once the DOM is ready, however often the event fires', () => {
    const callback = vi.fn();

    setReadyState('loading');
    onDomReady(callback);

    fireDomReady();
    fireDomReady();

    expect(callback).toHaveBeenCalledOnce();
  });
});
