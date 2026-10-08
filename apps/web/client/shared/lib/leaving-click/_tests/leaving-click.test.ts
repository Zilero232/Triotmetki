import { afterEach, describe, expect, it } from 'vitest';

import { isLeavingClick } from '@/shared/lib';

const isLeavingOn = (element: Element, init: MouseEventInit = {}) => {
  let isLeaving = false;

  const listener = (event: MouseEvent) => {
    isLeaving = isLeavingClick(event);
    event.preventDefault();
  };

  document.addEventListener('click', listener, { capture: true, once: true });
  element.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, button: 0, ...init }));

  return isLeaving;
};

const link = (attributes: Record<string, string>) => {
  const anchor = document.createElement('a');

  Object.entries(attributes).forEach(([name, value]) => anchor.setAttribute(name, value));
  anchor.textContent = 'link';
  document.body.append(anchor);

  return anchor;
};

afterEach(() => {
  document.body.replaceChildren();
});

describe('isLeavingClick', () => {
  it('flags a plain click on a link to another page', () => {
    expect(isLeavingOn(link({ href: '/blog' }))).toBe(true);
  });

  it('ignores a link to the same page', () => {
    expect(isLeavingOn(link({ href: window.location.pathname }))).toBe(false);
  });

  it('ignores a click that opens a new tab', () => {
    expect(isLeavingOn(link({ href: '/blog' }), { ctrlKey: true })).toBe(false);
  });

  it('ignores a link that opens in another window', () => {
    expect(isLeavingOn(link({ href: '/blog', target: '_blank' }))).toBe(false);
  });

  it('ignores a click outside any link', () => {
    const button = document.createElement('button');

    document.body.append(button);

    expect(isLeavingOn(button)).toBe(false);
  });
});
