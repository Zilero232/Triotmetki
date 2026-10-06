import { describe, expect, it } from 'vitest';

import { formatPercent } from '@/shared/lib/format-number';
import { readWidgetFixture } from '@/shared/lib/testing/widget-fixture';

import { TANK_CARD } from '../../../config';
import { tankCardSchema } from '../../../model/schemas';
import { deltaView, percentText, scaleMarks, scalePosition, tierText } from '../tank-card-view';

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

describe(tierText, () => {
  it('writes the tier as a roman numeral', () => {
    expect(tierText(7)).toBe('VII');
  });

  it('leaves an unknown tier out', () => {
    expect(tierText(null)).toBeNull();
  });
});

describe(percentText, () => {
  it('writes the percent as the battle panel does, with two decimals', () => {
    expect(percentText(86.1)).toBe(formatPercent({ value: 86.1, digits: 2 }));
  });

  it('shows a dash for an unknown percent', () => {
    expect(percentText(null)).toBe(TANK_CARD.unknownPercent);
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
