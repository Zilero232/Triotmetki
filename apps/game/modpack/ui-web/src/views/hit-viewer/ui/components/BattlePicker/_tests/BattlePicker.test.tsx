// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BattlePicker } from '../BattlePicker';

const battles = Array.from({ length: 30 }, (_, index) => ({
  id: `b${index}`,
  map: `Map ${index}`,
  vehicle: 'T-34',
  date: '01.10',
  tier: 5,
  result: index % 2 ? ('win' as const) : ('loss' as const),
  received: 2,
  dealt: 3
}));

const LABELS = { win: 'Win', loss: 'Defeat', draw: 'Draw' };
const SIDES = { received: 'On me', dealt: 'Mine' };

const renderPicker = (onPick = vi.fn()) => {
  const [current] = battles;

  if (!current) {
    throw new Error('no battle');
  }

  render(<BattlePicker battles={battles} current={current} label='Battles' labels={LABELS} sideLabels={SIDES} onPick={onPick} />);
  fireEvent.click(screen.getByRole('button', { name: 'Battles' }));

  return onPick;
};

describe(BattlePicker, () => {
  it('shows each battle with its result, tier and hit counts', () => {
    renderPicker();

    expect(screen.getAllByText('Win').length).toBeGreaterThan(0);
  });

  it('closes the list and reports the picked battle', () => {
    const onPick = renderPicker();

    fireEvent.click(screen.getByText('Map 3'));

    expect(onPick).toHaveBeenCalledWith('b3');
  });

  it('hides the list once a battle is picked', () => {
    renderPicker();

    fireEvent.click(screen.getByText('Map 3'));

    expect(screen.queryByText('Map 3')).toBeNull();
  });
});
