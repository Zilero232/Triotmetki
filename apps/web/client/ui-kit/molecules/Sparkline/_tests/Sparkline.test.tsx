import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Sparkline } from '../Sparkline';

describe('Sparkline', () => {
  it('is an image named by its label', () => {
    render(<Sparkline data={[1, 2]} label='WN8 trend' />);

    expect(screen.getByRole('img', { name: 'WN8 trend' })).toBeInTheDocument();
  });

  it('stays out of the accessibility tree without a label', () => {
    render(<Sparkline data={[1, 2]} />);

    expect(screen.queryByRole('img')).not.toBeInTheDocument();
  });
});
