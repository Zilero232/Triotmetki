// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FitBox } from '../FitBox';

const sized = (element: Element | null | undefined, { width, height }: { width: number; height: number }): void => {
  Object.defineProperty(element, 'offsetWidth', { value: width, configurable: true });
  Object.defineProperty(element, 'offsetHeight', { value: height, configurable: true });
};

type Size = { width: number; height: number };

const mount = ({ frame, content, minScale }: { frame: Size; content: Size; minScale?: number }) => {
  const html = render(
    <FitBox fallback={<b>icon</b>} minScale={minScale}>
      <span>sample</span>
    </FitBox>
  ).container;

  const frameElement = html.firstElementChild;
  const contentElement = frameElement?.firstElementChild;

  sized(frameElement, frame);
  sized(contentElement, content);

  void act(() => {
    window.dispatchEvent(new Event('resize'));
  });

  return { html, content: contentElement instanceof HTMLElement ? contentElement : null };
};

const fitted = (input: { frame: Size; content: Size }) => mount(input).content?.style.transform ?? '';

describe(FitBox, () => {
  it('scales content wider than its frame down to fit', () => {
    expect(fitted({ frame: { width: 300, height: 110 }, content: { width: 600, height: 40 } })).toBe('translate(0px, 45px) scale(0.5)');
  });

  it('keeps content that fits at its own size', () => {
    expect(fitted({ frame: { width: 300, height: 110 }, content: { width: 200, height: 40 } })).toBe('translate(50px, 35px) scale(1)');
  });

  it('hides content until the engine has laid it out', () => {
    const { content } = mount({ frame: { width: 300, height: 110 }, content: { width: 0, height: 0 } });

    expect(content?.style.opacity).toBe('0');
  });

  it('shows the fallback when the content would shrink below the readable scale', () => {
    const { html } = mount({ frame: { width: 100, height: 50 }, content: { width: 1000, height: 40 }, minScale: 0.3 });

    expect(html.querySelector('b')?.textContent).toBe('icon');
  });
});
