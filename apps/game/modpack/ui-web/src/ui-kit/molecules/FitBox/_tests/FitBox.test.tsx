// @vitest-environment jsdom
import { act, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FitBox } from '../FitBox';

const sized = (element: Element | null | undefined, { width, height }: { width: number; height: number }): void => {
  Object.defineProperty(element, 'offsetWidth', { value: width, configurable: true });
  Object.defineProperty(element, 'offsetHeight', { value: height, configurable: true });
};

const fitted = ({ frame, content }: { frame: { width: number; height: number }; content: { width: number; height: number } }) => {
  const html = render(
    <FitBox>
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

  return contentElement instanceof HTMLElement ? contentElement.style.transform : '';
};

describe(FitBox, () => {
  it('scales content wider than its frame down to fit', () => {
    expect(fitted({ frame: { width: 300, height: 110 }, content: { width: 600, height: 40 } })).toBe('scale(0.5)');
  });

  it('keeps content that fits at its own size', () => {
    expect(fitted({ frame: { width: 300, height: 110 }, content: { width: 200, height: 40 } })).toBe('scale(1)');
  });
});
