// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { act, createElement } from 'react';
import { describe, expect, it } from 'vitest';

import { stepBack } from '@/shared/lib/escape-stack';

import { SearchBox } from '../SearchBox';

const mountSearch = (query: string, cleared: string[] = []): HTMLInputElement => {
  const { container } = render(createElement(SearchBox, { query, onChange: () => undefined, onClear: () => cleared.push(query) }));
  const input = container.querySelector('input');

  if (!input) {
    throw new Error('the search box has no input');
  }

  return input;
};

const pressCtrlF = (): void => {
  void act(() => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'f', keyCode: 70, ctrlKey: true, cancelable: true }));
  });
};

const pressEsc = (): void => {
  act(() => {
    stepBack();
  });
};

describe(SearchBox, () => {
  it('takes the focus on Ctrl+F', () => {
    const input = mountSearch('');

    pressCtrlF();

    expect(document.activeElement).toBe(input);
  });

  it('clears a typed query on the first Esc', () => {
    const cleared: string[] = [];

    mountSearch('camo', cleared);
    pressCtrlF();

    pressEsc();

    expect(cleared).toEqual(['camo']);
  });

  it('gives the focus back on Esc once the query is empty', () => {
    const input = mountSearch('');

    pressCtrlF();

    pressEsc();

    expect(document.activeElement).not.toBe(input);
  });
});
