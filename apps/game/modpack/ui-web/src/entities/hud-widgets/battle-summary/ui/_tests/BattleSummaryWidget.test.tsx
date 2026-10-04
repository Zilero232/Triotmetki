// @vitest-environment jsdom
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { readWidgetFixture } from '../../../../../shared/lib/testing/widget-fixture';
import { battleSummarySchema } from '../../model/schemas';
import { BattleSummaryWidget } from '../BattleSummaryWidget';

import s from '../BattleSummaryWidget.module.scss';

const send = vi.hoisted(() => vi.fn());

vi.mock('../../../../../shared/api/hud-protocol', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../../../../../shared/api/hud-protocol')>()),
  sendHud: send
}));

const rowParts = (html: HTMLElement) => html.querySelector(`.${s.row}`)?.childElementCount;

const data = battleSummarySchema.parse(readWidgetFixture('battle_summary'));

describe(BattleSummaryWidget, () => {
  it('names the card, the battle and its result', () => {
    const html = render(<BattleSummaryWidget data={data} />).container;

    expect(html.textContent).toContain('Прошлый бой');
    expect(html.textContent).toContain('Т-34-85 · Малиновка');
    expect(html.textContent).toContain('поражение');
  });

  it('shows the damage, the XP and the credits as tiles', () => {
    const html = render(<BattleSummaryWidget data={data} />).container;

    expect(html.textContent).toContain('1 960');
    expect(html.textContent).toContain('812');
    expect(html.textContent).toContain('23 450');
  });

  it('shows the MoE change', () => {
    const html = render(<BattleSummaryWidget data={data} />).container;

    expect(html.textContent).toContain('-0.42%');
  });

  it('sends the panel id back when the close mark is clicked', () => {
    render(<BattleSummaryWidget data={data} />);

    fireEvent.click(screen.getByRole('button', { name: 'Закрыть' }));

    expect(send).toHaveBeenCalledWith({ type: 'pressed', id: 'otmetki.hud.last_battle' });
  });

  it('draws no close mark on the card of the running battle', () => {
    const html = render(<BattleSummaryWidget data={{ ...data, dismiss: null }} />).container;

    expect(html.querySelector('button')).toBeNull();
  });

  it('draws a progress bar only for a row with progress', () => {
    const row = { icon: null, text: 'Осн. калибр', value: '1 500', note: '/ 2 940', tone: 'text' as const, progress_tone: 'gold' as const };
    const plain = render(<BattleSummaryWidget data={{ ...data, rows: [{ ...row, progress: null }] }} />).container;
    const barred = render(<BattleSummaryWidget data={{ ...data, rows: [{ ...row, progress: 0.5 }] }} />).container;

    expect(rowParts(plain)).toBe(1);
    expect(rowParts(barred)).toBe(2);
  });
});
