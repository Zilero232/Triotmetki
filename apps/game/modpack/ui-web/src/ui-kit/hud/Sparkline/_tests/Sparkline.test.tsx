// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Sparkline } from '../Sparkline';

const SIZE = { width: 60, height: 16 };

describe(Sparkline, () => {
  it('keeps the line mounted while there are too few points', () => {
    const view = render(<Sparkline points={[1, 2, 3]} {...SIZE} />);
    const before = view.container.querySelector('svg');

    view.rerender(<Sparkline points={[1]} {...SIZE} />);

    expect(view.container.querySelector('svg')).toBe(before);
  });

  it('hides the line while there are too few points', () => {
    const html = render(<Sparkline points={[1]} {...SIZE} />).container;

    expect(html.querySelector('[class*="idle"]')).not.toBeNull();
  });
});
