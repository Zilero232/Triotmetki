import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { GameDataEntry, GameVersion, Vehicle } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { AppNotFoundException } from '../../../../common/exceptions';
import { loadIs } from '../../../gamedata/lib/_tests/fixtures';
import { BuildDataReaderService } from '../build-data-reader.service';

const is = loadIs();

const entry = (data: GameDataEntry['data']): GameDataEntry => ({
  gameVersionId: 3,
  kind: 'any',
  key: 'any',
  data,
  createdAt: new Date('2026-09-20T00:00:00Z')
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  return { service: new BuildDataReaderService(prisma), prisma };
};

describe('BuildDataReaderService.vehicle', () => {
  it('returns the stored game data of a tank', async () => {
    const { service, prisma } = createService();

    prisma.vehicle.findUnique.mockResolvedValue(mock<Vehicle>({ specs: JSON.parse(JSON.stringify(is)) }));

    expect((await service.vehicle(is.tankId)).tag).toBe(is.tag);
  });

  it('reports an unknown tank as not found', async () => {
    const { service, prisma } = createService();

    prisma.vehicle.findUnique.mockResolvedValue(null);

    await expect(service.vehicle(1)).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('reports a tank with unreadable game data as not found', async () => {
    const { service, prisma } = createService();

    prisma.vehicle.findUnique.mockResolvedValue(mock<Vehicle>({ specs: { tag: 'broken' } }));

    await expect(service.vehicle(1)).rejects.toBeInstanceOf(AppNotFoundException);
  });
});

describe('BuildDataReaderService.provisionsByIds', () => {
  it('skips the query for an empty id list', async () => {
    const { service, prisma } = createService();

    await expect(service.provisionsByIds([])).resolves.toEqual([]);
    expect(prisma.provision.findMany).not.toHaveBeenCalled();
  });
});

describe('BuildDataReaderService.progression', () => {
  it('has no progression for a tank without a tree name', async () => {
    const { service, prisma } = createService();

    await expect(service.progression(undefined)).resolves.toEqual({ tree: null, pairs: [] });
    expect(prisma.gameVersion.findFirst).not.toHaveBeenCalled();
  });

  it('has no progression before a current game version is known', async () => {
    const { service, prisma } = createService();

    prisma.gameVersion.findFirst.mockResolvedValue(null);

    await expect(service.progression('tree')).resolves.toEqual({ tree: null, pairs: [] });
    expect(prisma.gameDataEntry.findUnique).not.toHaveBeenCalled();
  });

  it('returns the tree and the pairs of the current version', async () => {
    const { service, prisma } = createService();

    prisma.gameVersion.findFirst.mockResolvedValue(mock<GameVersion>({ id: 3 }));
    prisma.gameDataEntry.findUnique.mockResolvedValue(entry({ name: 'tree' }));
    prisma.gameDataEntry.findMany.mockResolvedValue([entry({ name: 'pair' })]);

    await expect(service.progression('tree')).resolves.toEqual({ tree: { name: 'tree' }, pairs: [{ name: 'pair' }] });
  });

  it('keeps the pairs when the tree itself is missing', async () => {
    const { service, prisma } = createService();

    prisma.gameVersion.findFirst.mockResolvedValue(mock<GameVersion>({ id: 3 }));
    prisma.gameDataEntry.findUnique.mockResolvedValue(null);
    prisma.gameDataEntry.findMany.mockResolvedValue([entry({ name: 'pair' })]);

    await expect(service.progression('tree')).resolves.toEqual({ tree: null, pairs: [{ name: 'pair' }] });
  });
});
