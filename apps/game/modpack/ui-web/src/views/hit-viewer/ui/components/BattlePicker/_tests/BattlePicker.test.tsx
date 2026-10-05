// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BattlePicker } from '../BattlePicker';

const battles = Array.from({ length: 30 }, (_, index) => ({ id: `b${index}`, map: `Map ${index}`, vehicle: 'T-34', date: '01.10' }));

describe(BattlePicker, () => {
  it('scrolls its open list by script, not by the engine native overflow scroll', () => {
    const [current] = battles;

    if (!current) {
      throw new Error('no battle');
    }

    render(<BattlePicker battles={battles} current={current} label='Battles' onPick={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: 'Battles' }));

    const list = screen.getByText('Map 5').closest('button')?.parentElement;
    const wheel = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });

    list?.dispatchEvent(wheel);

    expect(wheel.defaultPrevented).toBe(true);
  });

  it('closes the list and reports the picked battle', () => {
    const onPick = vi.fn();
    const [current] = battles;

    if (!current) {
      throw new Error('no battle');
    }

    render(<BattlePicker battles={battles} current={current} label='Battles' onPick={onPick} />);
    fireEvent.click(screen.getByRole('button', { name: 'Battles' }));
    fireEvent.click(screen.getByText('Map 3'));

    expect(onPick).toHaveBeenCalledWith('b3');
    expect(screen.queryByText('Map 3')).toBeNull();
  });
});
