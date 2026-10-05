import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Arena, Battle, PlaySession } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { VehicleCatalogService } from '../../../reference';

import { AppNotFoundException } from '../../../../common/exceptions';
import { unknownVehicle } from '../../../reference';
import { PlayerSessionsReaderService } from '../player-sessions-reader.service';

const STARTED_AT = new Date('2026-09-25T18:00:00.000Z');

const session = (overrides: Partial<PlaySession> = {}): PlaySession =>
  mock<PlaySession>({
    id: 's1',
    accountId: 42n,
    kind: 'live',
    status: 'open',
    source: 'mod',
    day: null,
    startedAt: STARTED_AT,
    endedAt: null,
    battles: 0,
    wins: 0,
    damageDealt: 0,
    damageBlocked: 0,
    damageAssisted: 0,
    frags: 0,
    spotted: 0,
    xp: 0,
    survived: 0,
    credits: null,
    wn8: null,
    broneIndex: null,
    ...overrides
  });

const battle = (overrides: Partial<Battle>): Battle =>
  mock<Battle>({
    id: 'b',
    tankId: 1,
    arenaId: 'himmelsdorf',
    arenaUniqueId: 1n,
    battleType: 'random',
    result: 'win',
    survived: true,
    damageDealt: 1000,
    damageAssistedRadio: 0,
    damageAssistedTrack: 0,
    damageBlocked: 0,
    spotted: 0,
    frags: 0,
    xp: 0,
    credits: null,
    shotsFired: null,
    shotsHit: null,
    shots: null,
    moePercent: null,
    moePercentDelta: null,
    queueTimeMs: null,
    durationSec: null,
    startedAt: STARTED_AT,
    ...overrides
  });

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const catalog = mock<VehicleCatalogService>();

  catalog.summary.mockImplementation((tankId) => Promise.resolve(unknownVehicle(tankId)));
  prisma.arena.findMany.mockResolvedValue([]);

  return { service: new PlayerSessionsReaderService(prisma, catalog), prisma };
};

const withBattles = (battles: Battle[], overrides: Partial<PlaySession> = {}) => Object.assign(session(overrides), { battleRecords: battles });

describe('PlayerSessionsReaderService.list', () => {
  it('marks only an open live session as live', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findMany.mockResolvedValue([session(), session({ status: 'closed' }), session({ kind: 'day' })]);
    prisma.playSession.count.mockResolvedValue(3);

    const { items, total } = await service.list({ accountId: 42n, limit: 10, offset: 0 });

    expect(items.map((item) => item.isLive)).toEqual([true, false, false]);
    expect(total).toBe(3);
  });
});

describe('PlayerSessionsReaderService.detail', () => {
  it('answers 404 for a session of another account', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findFirst.mockResolvedValue(null);

    await expect(service.detail({ accountId: 42n, sessionId: 's1' })).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('picks the best and worst tank by average damage', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findFirst.mockResolvedValue(
      withBattles([battle({ tankId: 1, damageDealt: 3000 }), battle({ tankId: 2, damageDealt: 500 }), battle({ tankId: 2, damageDealt: 1500 })])
    );

    const detail = await service.detail({ accountId: 42n, sessionId: 's1' });

    expect(detail.tanks).toHaveLength(2);
    expect(detail.best?.vehicle.tankId).toBe(1);
    expect(detail.worst?.vehicle.tankId).toBe(2);
  });

  it('has no worst tank when only one tank was played', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findFirst.mockResolvedValue(withBattles([battle({ tankId: 1 })]));

    const detail = await service.detail({ accountId: 42n, sessionId: 's1' });

    expect(detail.best?.vehicle.tankId).toBe(1);
    expect(detail.worst).toBeNull();
  });

  it('lists battles only for sessions recorded by the mod', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findFirst.mockResolvedValue(withBattles([battle({})], { source: 'api' }));

    expect((await service.detail({ accountId: 42n, sessionId: 's1' })).battles).toBeNull();
  });

  it('names the map from the arena table and falls back to the arena id', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findFirst.mockResolvedValue(withBattles([battle({ arenaId: 'known' }), battle({ id: 'b2', arenaId: 'unknown' })]));
    prisma.arena.findMany.mockResolvedValue([mock<Arena>({ arenaId: 'known', name: 'Химмельсдорф' })]);

    const detail = await service.detail({ accountId: 42n, sessionId: 's1' });

    expect(detail.battles?.map((entry) => entry.mapName)).toEqual(['Химмельсдорф', 'unknown']);
  });

  it('converts queue time to seconds and keeps a missing one null', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findFirst.mockResolvedValue(withBattles([battle({ queueTimeMs: 2500 }), battle({ id: 'b2', queueTimeMs: null })]));

    const detail = await service.detail({ accountId: 42n, sessionId: 's1' });

    expect(detail.battles?.map((entry) => entry.queueTimeSec)).toEqual([2.5, null]);
  });

  it('drops malformed shot data instead of failing', async () => {
    const { service, prisma } = createService();

    prisma.playSession.findFirst.mockResolvedValue(withBattles([battle({ shots: [{ nonsense: true }] })]));

    expect((await service.detail({ accountId: 42n, sessionId: 's1' })).battles?.[0]?.shots).toBeNull();
  });
});
