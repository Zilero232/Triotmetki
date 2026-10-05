import type { BuildUsage } from '@otmetki/schemas';

import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { BuildUsageReaderService } from '../build-usage-reader.service';

import { BuildAdviceReaderService } from '../build-advice-reader.service';

const usage: BuildUsage = {
  mode: 'random',
  cohort: 'top10',
  battles: 3,
  players: 2,
  minSample: 30,
  isEnough: false,
  windowDays: 30,
  gameVersion: null,
  computedAt: null,
  winRate: null,
  avgDamage: null,
  equipment: [],
  consumables: [],
  directives: [],
  shells: [],
  fieldModifications: [],
  crew: []
};

describe('BuildAdviceReaderService', () => {
  it('reads the free default cohort of random battles', async () => {
    const buildUsage = mock<BuildUsageReaderService>();

    buildUsage.usage.mockResolvedValue(usage);

    const advice = await new BuildAdviceReaderService(buildUsage).advice(5);

    expect(buildUsage.usage).toHaveBeenCalledWith({ tankId: 5, mode: 'random', cohort: 'top10' });
    expect(advice).toEqual({ tankId: 5, isEnough: false, battles: 3, equipment: [], directives: [], consumables: [] });
  });
});
