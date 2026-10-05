// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { UiPage } from '@/shared/api/protocol';

import { ListPage } from '../ListPage';

const CHOOSE = { id: 'choose', label: 'Choose' };

const PAGE: UiPage = {
  kind: 'list',
  layout: 'gallery',
  note: 'The hangar changes at once',
  empty: 'No hangars',
  rows: [
    { id: 'native', title: 'As in the game', subtitle: 'The standard hangar', badge: null, actions: [CHOOSE] },
    { id: 'h16_mt_museum', title: 'Museum of Glory', subtitle: 'h16_mt_museum', badge: 'Chosen', image: null, actions: [] },
    {
      id: 'h14_mt_wt_2025',
      title: 'White Tiger',
      subtitle: 'h14_mt_wt_2025',
      badge: 'Now',
      image: 'img://white_tiger/gui/maps/icons/welcome/background.png',
      actions: [CHOOSE]
    }
  ]
};

describe(ListPage, () => {
  it('draws a gallery page as picture tiles with readable names and the folder underneath', () => {
    const { container } = render(<ListPage page={PAGE} onRun={vi.fn()} />);

    expect(screen.getAllByRole('listitem')).toHaveLength(3);
    expect(screen.getByText('White Tiger')).toBeTruthy();
    expect(screen.getByText('h14_mt_wt_2025')).toBeTruthy();
    expect(container.querySelector('img')?.getAttribute('src')).toBe('img://white_tiger/gui/maps/icons/welcome/background.png');
  });

  it('shows the page note above the tiles', () => {
    render(<ListPage page={PAGE} onRun={vi.fn()} />);

    expect(screen.getByText('The hangar changes at once')).toBeTruthy();
  });

  it('marks the chosen tile and keeps it from being chosen again', () => {
    render(<ListPage page={PAGE} onRun={vi.fn()} />);

    const chosen = screen.getByRole('button', { name: 'Museum of Glory' });

    expect(chosen.getAttribute('aria-pressed')).toBe('true');
    expect(chosen.hasAttribute('disabled')).toBe(true);
  });

  it('chooses a tile with one click on it', () => {
    const onRun = vi.fn();

    render(<ListPage page={PAGE} onRun={onRun} />);
    fireEvent.click(screen.getByRole('button', { name: 'White Tiger' }));

    expect(onRun).toHaveBeenCalledWith({ action: CHOOSE, row: 'h14_mt_wt_2025' });
  });

  it('keeps the plain list for a page without a layout', () => {
    render(<ListPage page={{ ...PAGE, layout: undefined, note: null }} onRun={vi.fn()} />);

    expect(screen.queryByRole('button', { name: 'White Tiger' })).toBeNull();
    expect(screen.getAllByRole('button', { name: 'Choose' })).toHaveLength(2);
  });
});
