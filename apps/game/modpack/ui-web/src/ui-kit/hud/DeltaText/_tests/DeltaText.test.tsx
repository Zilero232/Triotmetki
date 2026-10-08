// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DeltaText } from '../DeltaText';

describe(DeltaText, () => {
  it('keeps the triangle mounted when the change goes flat', () => {
    const view = render(<DeltaText direction='up' text='+0,12' />);
    const before = view.container.querySelector('svg');

    view.rerender(<DeltaText direction='flat' text='0,00' />);

    expect(view.container.querySelector('svg')).toBe(before);
  });

  it('hides the triangle of a flat change', () => {
    const html = render(<DeltaText direction='flat' text='0,00' />).container;

    expect(html.querySelector('[class*="idle"]')).not.toBeNull();
  });

  it('shows the triangle of a rise', () => {
    const html = render(<DeltaText direction='up' text='+0,12' />).container;

    expect(html.querySelector('[class*="idle"]')).toBeNull();
  });
});
