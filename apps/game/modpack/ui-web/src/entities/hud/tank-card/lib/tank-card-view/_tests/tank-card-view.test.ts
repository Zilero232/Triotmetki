import { describe, expect, it } from 'vitest';

import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { TANK_CARD } from '../../../config';
import { tankCardSchema } from '../../../model/schemas';
import { deltaView, scaleMarks, scalePosition } from '../tank-card-view';

const data = tankCardSchema.parse(readWidgetFixture('tank_card'));

describe(scalePosition, () => {
  it('gives every mark step an equal share of the bar', () => {
    const shares = TANK_CARD.steps.map((level) => scalePosition(level));

    expect(shares).toEqual([0, 25, 50, 75, 100]);
  });

  it('places a percent inside its step by its share of the step', () => {
    expect(scalePosition(90)).toBe(62.5);
  });

  it('keeps the position on the bar', () => {
    expect(scalePosition(120)).toBe(100);
  });
});

describe(scaleMarks, () => {
  it('marks each level with the average the site gives for it', () => {
    const marks = scaleMarks({ thresholds: data.thresholds, percent: data.percent });

    expect(marks.map((mark) => mark.average)).toEqual(data.thresholds.map((threshold) => threshold.average));
  });

  it('falls back to the percent for a level the site has no average for', () => {
    const marks = scaleMarks({ thresholds: [], percent: 86 });

    expect(marks.map((mark) => mark.reached)).toEqual([true, true, false, false]);
  });

  it('ends the bar at 100%', () => {
    const marks = scaleMarks({ thresholds: [], percent: null });

    expect(marks.filter((mark) => mark.isEnd).map((mark) => mark.level)).toEqual([100]);
  });
});

describe(deltaView, () => {
  it('signs a rise and points it up', () => {
    expect(deltaView(0.18)).toEqual({ text: '+0,18', direction: 'up' });
  });

  it('points a fall down', () => {
    expect(deltaView(-0.5)?.direction).toBe('down');
  });

  it('has nothing without a change', () => {
    expect(deltaView(null)).toBeNull();
  });
});
