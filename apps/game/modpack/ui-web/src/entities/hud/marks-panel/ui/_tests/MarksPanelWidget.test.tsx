// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { MARKS_PANEL } from '../../config';
import { marksPanelSchema } from '../../model/schemas';
import { MarksPanelWidget } from '../MarksPanelWidget';

const data = marksPanelSchema.parse(readWidgetFixture('marks_panel'));

const compact = { ...data, style: 'compact' as const, thresholds: [], step: null, average: null };

const extended = {
  ...data,
  style: 'extended' as const,
  thresholds: [
    { level: 65, need: 0, reached: true },
    { level: 85, need: 0, reached: true },
    { level: 95, need: 25195, reached: false }
  ],
  step: { step: 0.5, need: 955 },
  average: { label: 'среднее', ema: 2540, ema_projected: 2551 }
};

const rows = (html: HTMLElement) => html.firstElementChild?.children ?? [];

const text = (html: Element | null | undefined): string => (html?.textContent ?? '').replaceAll(' ', ' ');

describe(MarksPanelWidget, () => {
  it('draws the box with the percent, the battle damage against the average and the labelled goal', () => {
    const html = render(<MarksPanelWidget data={data} />).container;

    expect(text(rows(html)[0])).toContain('86,30');
    expect(text(rows(html)[0])).toContain('урон3 100 / 2 540');
    expect(text(rows(html)[0])).toContain('до 87 %2 107');
  });

  it('draws the detail rows under the box in the extended style', () => {
    const html = render(<MarksPanelWidget data={extended} />).container;

    expect(text(rows(html)[1])).toContain('25 195');
    expect(text(rows(html)[2])).toContain('среднее2 540');
    expect(text(rows(html)[2])).toContain('2 551');
  });

  it('draws the damage bar with the tick of the average', () => {
    const html = render(<MarksPanelWidget data={compact} />).container;

    expect(html.querySelector('[class*="hold"]')).not.toBeNull();
  });

  it('draws the percent scale when the panel sends no damage bar', () => {
    const html = render(<MarksPanelWidget data={{ ...compact, bar: null }} />).container;

    expect(html.querySelector('[class*="hold"]')).toBeNull();
    expect(html.querySelector('[class*="cursor"]')).not.toBeNull();
  });

  it('flashes the percent once when the goal is reached in battle', () => {
    const view = render(<MarksPanelWidget data={compact} />);

    expect(view.container.querySelector('[class*="pulse"]')).toBeNull();

    view.rerender(<MarksPanelWidget data={{ ...compact, goal: { level: 87, need: 0 } }} />);

    expect(view.container.querySelector('[class*="pulse"]')).not.toBeNull();
  });

  it('keeps the compact style to the box alone', () => {
    const html = render(<MarksPanelWidget data={compact} />).container;

    expect(rows(html)).toHaveLength(1);
  });

  it('lights one index bar per mark on the gun', () => {
    const html = render(<MarksPanelWidget data={compact} />).container;

    expect(html.querySelectorAll('[class*="lit"]')).toHaveLength(2);
  });

  it('draws no tank silhouette in battle', () => {
    const html = render(<MarksPanelWidget data={data} />).container;

    expect(html.querySelector('circle')).toBeNull();
  });

  it('keeps the client marks icon in the minimal line', () => {
    const html = render(<MarksPanelWidget data={{ ...compact, style: 'minimal' }} />).container;

    expect(html.querySelector('img')?.getAttribute('src')).toBe('img://gui/maps/icons/library/marksOnGun/mark_2.png');
  });

  it('marks an estimated percent', () => {
    const html = render(<MarksPanelWidget data={{ ...compact, estimated: true }} />).container;

    expect(html.textContent).toContain(MARKS_PANEL.approx);
  });

  it('says so when the tank has no thresholds', () => {
    const empty = { ...compact, has_curve: false, delta: null, goal: null, note: 'нет порогов' };
    const html = render(<MarksPanelWidget data={empty} />).container;

    expect(html.textContent).toContain('нет порогов');
  });

  it('draws a custom template as its text alone', () => {
    const custom = { ...compact, style: 'custom' as const, text: '86.12 / 95' };
    const html = render(<MarksPanelWidget data={custom} />).container;

    expect(html.textContent).toBe('86.12 / 95');
  });
});
