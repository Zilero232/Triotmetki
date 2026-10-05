import { MOD_AGGREGATES, PLAY_MODES } from '@otmetki/schemas';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ModeSqlRow } from '../../mappers';

import { MODE_META_AGGREGATE } from '../../config';
import { ModeMetaService } from '../mode-meta.service';
import { createPrisma, queryText, queryValues } from './aggregates.fixtures';

const NOW = new Date('2026-09-26T12:00:00Z');

const row: ModeSqlRow = {
  tank_id: 1,
  battles: MODE_META_AGGREGATE.minBattles,
  players: 2,
  wins: 3,
  decided: 5,
  avg_damage: 2000,
  avg_xp: 900,
  avg_frags: 1,
  survival_rate: null,
  mod_battles: 3,
  replay_battles: 2
};

const createMeta = () => {
  const prisma = createPrisma();

  prisma.$queryRaw.mockResolvedValue([]);

  return { prisma, service: new ModeMetaService(prisma) };
};

describe('ModeMetaService.compute', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('rebuilds every play mode separately and reports rows per mode', async () => {
    const { prisma, service } = createMeta();
    const [first] = PLAY_MODES;

    prisma.$queryRaw.mockResolvedValueOnce([row]);

    const counts = await service.compute();

    expect(Object.keys(counts)).toEqual([...PLAY_MODES]);
    expect(counts[first]).toBe(1);
    expect(prisma.modeTankAggregate.deleteMany.mock.calls.map(([args]) => args?.where?.mode)).toEqual([...PLAY_MODES]);
  });

  it('asks each mode for the minimum sample', async () => {
    const { prisma, service } = createMeta();

    await service.compute();

    for (const call of PLAY_MODES.keys()) {
      expect(queryValues(prisma, call)).toContain(MODE_META_AGGREGATE.minBattles);
    }
  });

  it('empties a mode that has no qualifying battles', async () => {
    const { prisma, service } = createMeta();

    await service.compute();

    expect(prisma.modeTankAggregate.createMany.mock.calls.every(([args]) => Array.isArray(args?.data) && args.data.length === 0)).toBe(true);
  });
});

describe('ModeMetaService.compute and distinct accounts', () => {
  it('publishes a tank of a mode only when enough distinct accounts feed it', async () => {
    const { prisma, service } = createMeta();

    await service.compute();

    expect(queryText(prisma)).toMatch(/HAVING count\(\*\) >= \?\s+AND count\(DISTINCT account_id\) >= \?/u);
    expect(queryValues(prisma)).toContain(MOD_AGGREGATES.minAccounts);
  });
});
