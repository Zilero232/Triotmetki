import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { MARKS_PANEL } from '../../../config';
import { marksPanelSchema } from '../../../model/schemas';
import { marksPanelView, shareText } from '../marks-panel-view';

const data = marksPanelSchema.parse(readWidgetFixture('marks_panel'));

describe(marksPanelView, () => {
  it('writes the percent the way the HUD formats numbers', () => {
    const view = marksPanelView(data);

    expect(view.percent).toBe('86,30 %');
  });

  it('signs the change and tones a gain as good', () => {
    const view = marksPanelView(data);

    expect(view.delta).toBe('+0,18');
    expect(view.deltaTone).toBe(MARKS_PANEL.deltaTones.rising);
  });

  it('tones a loss as bad', () => {
    const view = marksPanelView({ ...data, delta: -0.2 });

    expect(view.deltaTone).toBe(MARKS_PANEL.deltaTones.falling);
  });

  it('keeps the tone the panel sent for the percent', () => {
    const view = marksPanelView({ ...data, tone: 'gold' });

    expect(view.tone).toBe('gold');
  });

  it('labels the damage for the next goal with its level', () => {
    const view = marksPanelView(data);

    expect(view.target).toEqual({ label: 'до 87 %', need: 2107, reached: false });
  });

  it('puts the battle damage and the average that holds the percent on the bar', () => {
    const view = marksPanelView(data);

    expect(view.bar?.fill).toBeCloseTo(3100 / 5207);
    expect(view.bar?.hold).toBeCloseTo(2540 / 5207);
    expect(view.bar?.tone).toBe('good');
  });

  it('tones the bar plain below the average and gold at the goal', () => {
    expect(marksPanelView({ ...data, bar: { value: 900, hold: 2540, end: 5207 } }).bar?.tone).toBe('text');
    expect(marksPanelView({ ...data, bar: { value: 5207, hold: 2540, end: 5207 } }).bar?.tone).toBe('gold');
  });

  it('keeps the percent scale when the panel sends no damage bar', () => {
    expect(marksPanelView({ ...data, bar: null }).bar).toBeNull();
  });

  it('counts a new mark or a reached goal as a milestone', () => {
    const base = marksPanelView(data).milestone;

    expect(marksPanelView({ ...data, goal: { level: 87, need: 0 } }).milestone).toBe(base + 1);
    expect(marksPanelView({ ...data, percent: 95.1 }).milestone).toBe(base + 2);
  });

  it('compares the battle damage with the average', () => {
    const view = marksPanelView(data);

    expect(view.damage).toEqual({ label: 'урон', value: 3100, target: ' / 2 540', tone: 'good' });
  });

  it('marks the goal reached when no damage is left', () => {
    const view = marksPanelView({ ...data, goal: { level: 87, need: 0 } });

    expect(view.goal?.reached).toBe(true);
  });

  it('writes the damage left only for the thresholds not yet reached', () => {
    const view = marksPanelView(data);

    expect(view.thresholds.map((item) => item.value)).toEqual(['', '', '25 195']);
  });

  it('writes the damage for the next half-percent step', () => {
    const view = marksPanelView(data);

    expect(view.step).toBe('+0,5 %: 955');
  });

  it('writes the average before and after the battle with its direction', () => {
    const view = marksPanelView(data);

    expect(view.average).toEqual({ label: 'среднее', from: '2 540', to: '2 551', direction: 'up' });
  });

  it('writes a dash for an unknown percent', () => {
    const view = marksPanelView({ ...data, percent: null, mark: null });

    expect(view.percent).toBe(MARKS_PANEL.unknownPercent);
    expect(view.mark).toBe(MARKS_PANEL.fallbackMark);
  });

  it('marks an estimated percent as approximate', () => {
    const view = marksPanelView({ ...data, estimated: true });

    expect(view.approx).toBe(true);
  });

  it('keeps the text only for a custom template', () => {
    expect(marksPanelView({ ...data, style: 'custom', text: '86' }).text).toBe('86');
    expect(marksPanelView({ ...data, text: '86' }).text).toBeNull();
  });
});

describe(shareText, () => {
  it('rounds a share to a tenth of a percent', () => {
    expect(shareText(0.12345)).toBe('12.3%');
  });
});
