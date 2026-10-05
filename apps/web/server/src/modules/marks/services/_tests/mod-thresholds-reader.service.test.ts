import type { MoeCurve } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { MasteryThresholdRecord, MoeThresholdRecord } from '../../../reference';

import { ThresholdsService } from '../../../reference';
import { ModThresholdsReaderService } from '../mod-thresholds-reader.service';
import { MoeCurveReaderService } from '../moe-curve-reader.service';

const CAPTURED_AT = new Date('2026-09-30T06:10:00.000Z');

const moe: MoeThresholdRecord = {
  tankId: 7_169,
  date: new Date('2026-09-30'),
  source: 'otmetki',
  sampleSize: 12,
  capturedAt: CAPTURED_AT,
  p65: 2_000,
  p85: 2_600,
  p95: 3_100,
  p100: null
};

const mastery: MasteryThresholdRecord = {
  tankId: 7_169,
  date: new Date('2026-09-30'),
  source: 'lesta',
  sampleSize: null,
  capturedAt: CAPTURED_AT,
  class3: 540,
  class2: 710,
  class1: 960,
  master: 1_320
};

const curve = (points: MoeCurve['points']): MoeCurve => ({ tankId: 7_169, windowDays: 14, bandPercent: 1, minPlayers: 5, thresholds: null, points });

const createService = ({
  moe: known,
  mastery: badge,
  points
}: {
  moe: MoeThresholdRecord | null;
  mastery: MasteryThresholdRecord | null;
  points: MoeCurve['points'];
}) => {
  const thresholds = mock<ThresholdsService>();
  const curves = mock<MoeCurveReaderService>();

  thresholds.moe.mockResolvedValue(known);
  thresholds.mastery.mockResolvedValue(badge);
  curves.curve.mockResolvedValue(curve(points));

  return new ModThresholdsReaderService(thresholds, curves);
};

describe('ModThresholdsReaderService.forTank', () => {
  it('answers the known thresholds with the curve points beside them', async () => {
    const service = createService({ moe, mastery, points: [{ percent: 70, damage: 2_200, players: 6, battles: 40 }] });

    const answer = await service.forTank(7_169);

    expect(answer.is_enough).toBe(true);
    expect(answer.thresholds).toEqual({ '65': 2_000, '85': 2_600, '95': 3_100 });
    expect(answer.curve).toEqual([{ percent: 70, damage: 2_200, players: 6, battles: 40 }]);
    expect(answer.mastery).toEqual({ class3: 540, class2: 710, class1: 960, ace: 1_320 });
    expect(answer.updated_at).toBe(CAPTURED_AT.toISOString());
    expect(answer.source).toBe('otmetki');
  });

  it('adds the 100 % level only when it is known', async () => {
    const service = createService({ moe: { ...moe, p100: 3_900 }, mastery: null, points: [] });

    expect((await service.forTank(7_169)).thresholds).toEqual({ '65': 2_000, '85': 2_600, '95': 3_100, '100': 3_900 });
  });

  it('answers is_enough false with whatever the curve holds instead of failing without thresholds', async () => {
    const service = createService({ moe: null, mastery: null, points: [{ percent: 65, damage: 1_900, players: 5, battles: 20 }] });

    const answer = await service.forTank(7_169);

    expect(answer).toEqual({
      tank_id: 7_169,
      is_enough: false,
      thresholds: {},
      curve: [{ percent: 65, damage: 1_900, players: 5, battles: 20 }],
      updated_at: null,
      source: null
    });
  });
});
