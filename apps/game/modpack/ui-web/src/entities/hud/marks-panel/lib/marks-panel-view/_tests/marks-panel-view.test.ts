import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { MARKS_PANEL } from '../../../config';
import { marksPanelSchema } from '../../../model/schemas';
import { marksPanelView } from '../marks-panel-view';

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

  it('writes the damage for the next goal', () => {
    const view = marksPanelView(data);

    expect(view.goal).toEqual({ level: 87, label: '87 %', value: '2 107', reached: false });
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

  it('writes the average before and after the battle', () => {
    const view = marksPanelView(data);

    expect(view.average).toEqual({ label: 'ср.', value: ['2 540', MARKS_PANEL.arrow, '2 551'].join(' ') });
  });

  it('writes the battles to the next mark', () => {
    const view = marksPanelView(data);

    expect(view.battles).toEqual({ label: '95 %', value: '~45 боёв' });
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
