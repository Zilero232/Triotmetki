import { PLAY_MODES } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ModeMetaRow } from '../../mappers/mode-meta.types';
import type { MetaQueries } from '../../meta.types';

import { mockPrismaService } from '../../../../../../core/prisma/_tests/prisma-mock';
import { bonusTypesOfMode } from '../../../../../reference';
import { MODE_META_AGGREGATE } from '../../config/meta.constants';
import { ModeMetaAggregateService } from '../mode-meta-aggregate.service';

const ROW: ModeMetaRow = {
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
  const prisma = mockPrismaService();
  const queries = mock<MetaQueries>();

  prisma.$transaction.mockResolvedValue([]);
  queries.modeMetaRows.mockResolvedValue([]);

  return { prisma, queries, service: new ModeMetaAggregateService(prisma, queries) };
};

describe('ModeMetaAggregateService.compute', () => {
  it('rebuilds every play mode separately and reports rows per mode', async () => {
    const { prisma, queries, service } = createMeta();
    const [first] = PLAY_MODES;

    queries.modeMetaRows.mockResolvedValueOnce([ROW]);

    const counts = await service.compute();

    expect(counts).toEqual(Object.fromEntries(PLAY_MODES.map((mode) => [mode, mode === first ? 1 : 0])));
    expect(prisma.modeTankAggregate.deleteMany.mock.calls.map(([args]) => args?.where?.mode)).toEqual([...PLAY_MODES]);
  });

  it('reads each mode through its own battle types', async () => {
    const { queries, service } = createMeta();

    await service.compute();

    expect(queries.modeMetaRows.mock.calls.map(([input]) => input.battleTypes)).toEqual(PLAY_MODES.map((mode) => bonusTypesOfMode(mode)));
  });

  it('empties a mode that has no qualifying battles', async () => {
    const { prisma, service } = createMeta();

    await service.compute();

    expect(prisma.modeTankAggregate.createMany.mock.calls.every(([args]) => Array.isArray(args?.data) && args.data.length === 0)).toBe(true);
  });
});
