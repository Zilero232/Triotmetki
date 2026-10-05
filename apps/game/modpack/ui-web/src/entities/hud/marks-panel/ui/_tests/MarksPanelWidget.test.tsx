// @vitest-environment jsdom
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { MARKS_PANEL } from '../../config';
import { marksPanelSchema } from '../../model/schemas';
import { MarksPanelWidget } from '../MarksPanelWidget';

const data = marksPanelSchema.parse(readWidgetFixture('marks_panel'));

const compact = { ...data, style: 'compact' as const, thresholds: [], step: null, average: null, battles: null };

const rows = (html: HTMLElement) => html.firstElementChild?.children ?? [];

const text = (html: Element | null | undefined): string => (html?.textContent ?? '').replaceAll(' ', ' ');

describe(MarksPanelWidget, () => {
  it('draws the box with the percent and the threshold scale on top', () => {
    const html = render(<MarksPanelWidget data={data} />).container;

    expect(text(rows(html)[0])).toContain('86,30');
    expect(text(rows(html)[0])).toContain('95');
  });

  it('grows the detail rows under the box while Alt is held', () => {
    const html = render(<MarksPanelWidget data={data} />).container;

    expect(text(rows(html)[1])).toContain('3 100 / 2 540');
    expect(text(rows(html)[2])).toContain('25 195');
    expect(text(rows(html)[3])).toContain('2 551');
  });

  it('shows the next goal on the main row', () => {
    const html = render(<MarksPanelWidget data={compact} />).container;

    expect(text(html)).toContain('87 %2 107');
  });

  it('keeps the compact style to the box alone', () => {
    const html = render(<MarksPanelWidget data={compact} />).container;

    expect(rows(html)).toHaveLength(1);
  });

  it('lights one index bar per mark on the gun', () => {
    const html = render(<MarksPanelWidget data={compact} />).container;

    expect(html.querySelectorAll('[class*="lit"]')).toHaveLength(2);
  });

  it('fills the tank silhouette in the silhouette style', () => {
    const html = render(<MarksPanelWidget data={{ ...compact, look: 'silhouette', silhouette: 'heavy' }} />).container;

    expect(html.querySelectorAll('svg path').length).toBeGreaterThan(2);
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
