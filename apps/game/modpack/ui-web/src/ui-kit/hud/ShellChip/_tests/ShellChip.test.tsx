// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ShellChip } from '../ShellChip';

describe(ShellChip, () => {
  it('writes the shell label', () => {
    const html = render(<ShellChip gold={false} label='ББ' />).container;

    expect(html.textContent).toBe('ББ');
  });

  it('marks a premium shell apart from a regular one', () => {
    const regular = render(<ShellChip gold={false} label='БП' />).container.firstElementChild?.className;
    const premium = render(<ShellChip gold label='БП' />).container.firstElementChild?.className;

    expect(premium).not.toBe(regular);
  });
});
