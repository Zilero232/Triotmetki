import type { BuildOptions, ProvisionOption } from '@otmetki/schemas';

import { BUILD_USAGE } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { BuildUsageAggregate } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { BuildDataReaderService } from '../build-data-reader.service';
import type { BuildOptionsReaderService } from '../build-options-reader.service';

import { loadIs } from '../../../gamedata/lib/_tests/fixtures';
import { BuildUsageReaderService } from '../build-usage-reader.service';

const is = loadIs();

const option = (id: number): ProvisionOption => ({
  id,
  tag: `item_${id}`,
  name: `item ${id}`,
  kind: 'optionalDevice',
  variant: null,
  group: null,
  image: null,
  price: null,
  categories: [],
  effects: []
});

const options: BuildOptions = {
  tankId: is.tankId,
  modules: { chassis: [], turrets: [], engines: [], radios: [] },
  crew: [],
  optionalDevices: [option(1), option(2)],
  consumables: [],
  directives: [],
  fieldModifications: [],
  crewSkills: [],
  slots: { optionalDevices: 3, consumables: 3, directives: 1 }
};

const pick = (id: number) => ({ id, battles: 40, share: 0.5, winRate: 55, avgDamage: 3_000 });

const aggregate = (overrides: Partial<BuildUsageAggregate>): BuildUsageAggregate => ({
  tankId: is.tankId,
  mode: 'random',
  cohort: 'all',
  gameVersion: '2.0',
  battles: BUILD_USAGE.minSample,
  players: 10,
  winRate: 52,
  avgDamage: 2_900,
  windowDays: 30,
  computedAt: new Date('2026-09-20T00:00:00Z'),
  usage: { equipment: [{ slot: 0, picks: [pick(1)] }], consumables: [], directives: [], fieldModifications: [], shells: [], crew: [] },
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const data = mock<BuildDataReaderService>();
  const buildOptions = mock<BuildOptionsReaderService>();

  data.vehicle.mockResolvedValue(is);
  buildOptions.options.mockResolvedValue(options);
  prisma.buildUsageAggregate.findFirst.mockResolvedValue(null);
  prisma.buildUsageAggregate.findMany.mockResolvedValue([]);

  return { service: new BuildUsageReaderService(prisma, data, buildOptions), prisma };
};

describe('BuildUsageReaderService.usage', () => {
  it('reports an empty, not-enough usage when nothing was aggregated', async () => {
    const { service } = createService();

    const usage = await service.usage({ tankId: is.tankId, mode: 'random', cohort: 'top10' });

    expect(usage).toMatchObject({ mode: 'random', cohort: 'top10', battles: 0, isEnough: false, equipment: [] });
  });

  it('resolves the stored picks against the tank options', async () => {
    const { service, prisma } = createService();

    prisma.buildUsageAggregate.findFirst.mockResolvedValue(aggregate({}));

    const usage = await service.usage({ tankId: is.tankId, mode: 'random', cohort: 'all' });

    expect(usage.isEnough).toBe(true);
    expect(usage.equipment[0]?.picks.map((entry) => entry.option.id)).toEqual([1]);
  });
});

describe('BuildUsageReaderService.history', () => {
  it('lists one entry per aggregate, in the stored order, with its version and time', async () => {
    const { service, prisma } = createService();

    prisma.buildUsageAggregate.findMany.mockResolvedValue([
      aggregate({ gameVersion: '2.1', computedAt: new Date('2026-09-25T00:00:00Z') }),
      aggregate({ gameVersion: '2.0', computedAt: new Date('2026-09-10T00:00:00Z'), battles: BUILD_USAGE.minSample - 1 })
    ]);

    const history = await service.history({ tankId: is.tankId, query: { mode: 'random', cohort: 'all' } });

    expect(history.entries.map((entry) => entry.gameVersion)).toEqual(['2.1', '2.0']);
    expect(history.entries[0]?.computedAt).toBe('2026-09-25T00:00:00.000Z');
    expect(history.entries[0]?.equipment.map((entry) => entry.option.id)).toEqual([1]);
    expect(history.entries[1]?.equipment).toEqual([]);
  });

  it('returns no entries for a tank without aggregates', async () => {
    const { service } = createService();

    await expect(service.history({ tankId: is.tankId, query: { mode: 'onslaught', cohort: 'top1' } })).resolves.toEqual({
      tankId: is.tankId,
      mode: 'onslaught',
      cohort: 'top1',
      entries: []
    });
  });
});
