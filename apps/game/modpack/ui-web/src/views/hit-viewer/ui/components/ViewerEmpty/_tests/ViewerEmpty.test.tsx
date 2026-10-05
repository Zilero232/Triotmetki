// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ViewerEmpty } from '../ViewerEmpty';

const labels = { close: 'Close', no_battles: 'Play a battle', no_battles_title: 'No battles' };

describe(ViewerEmpty, () => {
  it('tells the player to play a battle first', () => {
    render(<ViewerEmpty labels={labels} onClose={vi.fn()} />);

    expect(screen.getByRole('status').textContent).toBe('Play a battle');
  });

  it('closes the viewer from its own button', () => {
    const onClose = vi.fn();

    render(<ViewerEmpty labels={labels} onClose={onClose} />);
    fireEvent.click(screen.getByRole('button', { name: 'Close' }));

    expect(onClose).toHaveBeenCalledOnce();
  });
});
