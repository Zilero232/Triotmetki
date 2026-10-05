// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { battleSummarySchema } from '../../model/schemas';
import { BattleSummaryWidget } from '../BattleSummaryWidget';

import s from '../BattleSummaryWidget.module.scss';

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

  it('draws nothing to click', () => {
    const html = render(<BattleSummaryWidget data={data} />).container;

    expect(html.querySelector('button')).toBeNull();
  });

  it('slides in and fades out over the time the card shows', () => {
    const html = render(<BattleSummaryWidget data={data} />).container;
    const card = html.querySelector<HTMLElement>(`.${s.card}`);

    expect(card?.style.animationDuration).toBe('8s');
  });

  it('starts its entrance again for the next card', () => {
    const view = render(<BattleSummaryWidget data={data} />);
    const first = view.container.querySelector(`.${s.card}`);

    view.rerender(<BattleSummaryWidget data={{ ...data, card: '2' }} />);

    expect(view.container.querySelector(`.${s.card}`)).not.toBe(first);
  });

  it('draws a progress bar only for a row with progress', () => {
    const row = { icon: null, text: 'Осн. калибр', value: '−1 440', note: null, tone: 'text' as const, progress_tone: 'gold' as const };
    const plain = render(<BattleSummaryWidget data={{ ...data, rows: [{ ...row, progress: null }] }} />).container;
    const barred = render(<BattleSummaryWidget data={{ ...data, rows: [{ ...row, progress: 0.5 }] }} />).container;

    expect(rowParts(plain)).toBe(1);
    expect(rowParts(barred)).toBe(2);
  });
});
