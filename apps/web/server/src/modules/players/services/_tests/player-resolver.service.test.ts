import RedisMock from 'ioredis-mock';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Player } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { BattleStatsBlock, LestaClient } from '../../../../lib/lesta';
import type { CollectorProducerService, PurgeGuardService } from '../../../collector';
import type { LestaPlayerInfo } from '../../players.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { insensitiveEquals } from '../../../../common/lib';
import { LESTA_ERROR_CODE, LestaApiError } from '../../../../lib/lesta';
import { PLAYER_LOOKUP } from '../../config/player-lookup.constants';
import { missingPlayerKey } from '../../lib/missing-player/missing-player';
import { PlayerResolverService } from '../player-resolver.service';

const NOW = new Date('2026-09-26T12:00:00.000Z');

const BLOCK: BattleStatsBlock = {
  battles: 10,
  wins: 5,
  losses: 5,
  draws: 0,
  xp: 5000,
  damage_dealt: 15_000,
  damage_received: 12_000,
  frags: 6,
  spotted: 8,
  capture_points: 0,
  dropped_capture_points: 1,
  hits: 60,
  shots: 80,
  survived_battles: 3
};

const INFO: LestaPlayerInfo = {
  account_id: 42,
  nickname: 'Tanker',
  clan_id: null,
  global_rating: 5000,
  created_at: 1_600_000_000,
  last_battle_time: 1_700_000_000,
  logout_at: null,
  updated_at: 1_700_000_100,
  statistics: { all: BLOCK }
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const collector = mock<CollectorProducerService>();
  const lesta = mockDeep<LestaClient>();
  const redis = new RedisMock();
  const purgeGuard = mock<PurgeGuardService>();

  prisma.player.update.mockResolvedValue(mock<Player>());
  purgeGuard.blocked.mockResolvedValue(new Set());

  return { service: new PlayerResolverService(prisma, collector, lesta, redis, purgeGuard), prisma, collector, lesta, redis, purgeGuard };
};

describe('PlayerResolverService.resolve', () => {
  it('treats a numeric input as an account id without a nickname lookup', async () => {
    const { service, prisma } = createService();

    prisma.player.findUnique.mockResolvedValue(mock<Player>({ accountId: 42n, isHidden: false }));

    await expect(service.resolve('42')).resolves.toBe(42n);
    expect(prisma.player.findFirst).not.toHaveBeenCalled();
  });

  it('resolves a known nickname from the local database without calling Lesta', async () => {
    const { service, prisma, lesta } = createService();

    prisma.player.findFirst.mockResolvedValue(mock<Player>({ accountId: 7n, isHidden: false }));
    prisma.player.findUnique.mockResolvedValue(mock<Player>({ accountId: 7n, isHidden: false }));

    await expect(service.resolve('Tanker')).resolves.toBe(7n);
    expect(lesta.account.list).not.toHaveBeenCalled();
  });

  it('falls back to an exact Lesta search for an unknown nickname', async () => {
    const { service, prisma, lesta } = createService();

    prisma.player.findFirst.mockResolvedValue(null);
    lesta.account.list.mockResolvedValue([{ account_id: 42, nickname: 'Tanker' }]);
    prisma.player.findUnique.mockResolvedValue(mock<Player>({ accountId: 42n, isHidden: false }));

    await expect(service.resolve('Tanker')).resolves.toBe(42n);
  });

  it('answers 404 when Lesta knows no such nickname', async () => {
    const { service, prisma, lesta } = createService();

    prisma.player.findFirst.mockResolvedValue(null);
    lesta.account.list.mockResolvedValue([]);

    await expect(service.resolve('Nobody')).rejects.toBeInstanceOf(AppNotFoundException);
  });

  it('remembers an unknown nickname for a while and answers 404 without asking Lesta again', async () => {
    const { service, prisma, lesta, redis } = createService();

    prisma.player.findFirst.mockResolvedValue(null);
    lesta.account.list.mockResolvedValue([]);

    await expect(service.resolve('Nobody')).rejects.toBeInstanceOf(AppNotFoundException);
    await expect(service.resolve('NOBODY')).rejects.toMatchObject({ response: { code: 'PLAYER_NOT_FOUND' } });

    expect(lesta.account.list).toHaveBeenCalledOnce();
    const ttl = await redis.ttl(missingPlayerKey({ kind: 'nickname', value: 'nobody' }));

    expect(ttl).toBeGreaterThan(0);
    expect(ttl).toBeLessThanOrEqual(PLAYER_LOOKUP.missingTtlSeconds);
  });

  it('still finds a nickname that reached the database after it was remembered as missing', async () => {
    const { service, prisma, lesta, redis } = createService();

    await redis.set(missingPlayerKey({ kind: 'nickname', value: 'Tanker' }), PLAYER_LOOKUP.missingMarker);
    prisma.player.findFirst.mockResolvedValue(mock<Player>({ accountId: 7n, isHidden: false }));
    prisma.player.findUnique.mockResolvedValue(mock<Player>({ accountId: 7n, isHidden: false }));

    await expect(service.resolve('Tanker')).resolves.toBe(7n);
    expect(lesta.account.list).not.toHaveBeenCalled();
  });

  it('does not remember a nickname when the Lesta search fails', async () => {
    const { service, prisma, lesta, redis } = createService();

    prisma.player.findFirst.mockResolvedValue(null);
    lesta.account.list.mockRejectedValue(new Error('lesta down'));

    await expect(service.resolve('Nobody')).rejects.toThrow('lesta down');
    await expect(redis.exists(missingPlayerKey({ kind: 'nickname', value: 'Nobody' }))).resolves.toBe(0);
  });

  it('answers 404 and remembers the nickname when Lesta refuses the search itself', async () => {
    const { service, prisma, lesta, redis } = createService();

    prisma.player.findFirst.mockResolvedValue(null);
    lesta.account.list.mockRejectedValue(new LestaApiError({ code: LESTA_ERROR_CODE.invalidSearch, method: 'account/list', field: 'search' }));

    await expect(service.resolve('Вася')).rejects.toBeInstanceOf(AppNotFoundException);
    await expect(redis.exists(missingPlayerKey({ kind: 'nickname', value: 'Вася' }))).resolves.toBe(1);
  });

  it('matches an underscore in a nickname literally, not as a LIKE wildcard', async () => {
    const { service, prisma } = createService();

    prisma.player.findFirst.mockResolvedValue(mock<Player>({ accountId: 7n, isHidden: false }));
    prisma.player.findUnique.mockResolvedValue(mock<Player>({ accountId: 7n, isHidden: false }));

    await service.resolve('Vasya_Pupkin');

    expect(prisma.player.findFirst.mock.calls[0]?.[0]?.where).toEqual({ nickname: insensitiveEquals('Vasya_Pupkin') });
    expect(prisma.player.findFirst.mock.calls[0]?.[0]?.where).not.toEqual({ nickname: { equals: 'Vasya_Pupkin', mode: 'insensitive' } });
  });
});

describe('PlayerResolverService.ensure', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('hides a player who asked to be hidden', async () => {
    const { service, prisma } = createService();

    prisma.player.findUnique.mockResolvedValue(mock<Player>({ accountId: 42n, isHidden: true }));

    await expect(service.ensure(42n)).rejects.toMatchObject({ response: { code: 'LESTA_ACCOUNT_HIDDEN' } });
    expect(prisma.player.update).not.toHaveBeenCalled();
  });

  it('refuses to bring back a purged account that has a deletion request', async () => {
    const { service, prisma, collector, lesta, purgeGuard } = createService();

    prisma.player.findUnique.mockResolvedValue(null);
    purgeGuard.blocked.mockResolvedValue(new Set([42]));

    await expect(service.ensure(42n)).rejects.toMatchObject({ response: { code: 'LESTA_ACCOUNT_HIDDEN' } });
    expect(lesta.account.info).not.toHaveBeenCalled();
    expect(prisma.player.upsert).not.toHaveBeenCalled();
    expect(collector.enrol).not.toHaveBeenCalled();
  });

  it('records the view of a known player without enrolling it again', async () => {
    const { service, prisma, collector } = createService();

    prisma.player.findUnique.mockResolvedValue(mock<Player>({ accountId: 42n, isHidden: false }));

    await expect(service.ensure(42n)).resolves.toBe(42n);

    await vi.waitFor(() => {
      expect(prisma.player.update).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: 42n }, data: { lastViewedAt: NOW } }));
    });

    expect(collector.enrol).not.toHaveBeenCalled();
  });

  it('writes the view of one player at most once per throttle window, however many endpoints resolve it', async () => {
    const { service, prisma } = createService();

    prisma.player.findUnique.mockResolvedValue(mock<Player>({ accountId: 42n, isHidden: false }));

    await service.ensure(42n);

    await vi.waitFor(() => {
      expect(prisma.player.update).toHaveBeenCalledTimes(1);
    });

    await service.ensure(42n);
    await service.ensure(42n);

    await vi.waitFor(() => {
      expect(prisma.player.findUnique).toHaveBeenCalledTimes(3);
    });

    expect(prisma.player.update).toHaveBeenCalledTimes(1);
  });

  it('still resolves when recording the view fails', async () => {
    const { service, prisma } = createService();

    prisma.player.findUnique.mockResolvedValue(mock<Player>({ accountId: 42n, isHidden: false }));
    prisma.player.update.mockRejectedValue(new Error('db down'));

    await expect(service.ensure(42n)).resolves.toBe(42n);
  });

  it('imports an unknown player from Lesta and enrols it with high priority', async () => {
    const { service, prisma, lesta, collector } = createService();

    prisma.player.findUnique.mockResolvedValue(null);
    lesta.account.info.mockResolvedValue({ '42': INFO });

    await expect(service.ensure(42n)).resolves.toBe(42n);
    expect(prisma.player.upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { accountId: 42n } }));
    expect(collector.enrol).toHaveBeenCalledWith(expect.objectContaining({ accountId: 42, priority: 'high' }));
  });

  it('answers 404 when neither the database nor Lesta know the id', async () => {
    const { service, prisma, lesta, collector } = createService();

    prisma.player.findUnique.mockResolvedValue(null);
    lesta.account.info.mockResolvedValue({ '42': null });

    await expect(service.ensure(42n)).rejects.toMatchObject({ response: { code: 'PLAYER_NOT_FOUND' } });
    expect(collector.enrol).not.toHaveBeenCalled();
  });

  it('remembers an unknown id and answers 404 without asking Lesta again', async () => {
    const { service, prisma, lesta } = createService();

    prisma.player.findUnique.mockResolvedValue(null);
    lesta.account.info.mockResolvedValue({ '42': null });

    await expect(service.ensure(42n)).rejects.toMatchObject({ response: { code: 'PLAYER_NOT_FOUND' } });
    await expect(service.ensure(42n)).rejects.toMatchObject({ response: { code: 'PLAYER_NOT_FOUND' } });

    expect(lesta.account.info).toHaveBeenCalledOnce();
  });
});

describe('PlayerResolverService.upsertFromLesta', () => {
  it('stores the clan id as a bigint and keeps a clanless player without one', async () => {
    const { service, prisma } = createService();

    await service.upsertFromLesta({ ...INFO, clan_id: 500 });
    await service.upsertFromLesta(INFO);

    expect(prisma.player.upsert.mock.calls[0]?.[0].create).toMatchObject({ clanId: 500n, nickname: 'Tanker' });
    expect(prisma.player.upsert.mock.calls[1]?.[0].create).toMatchObject({ clanId: null });
  });

  it('keeps the nickname history of the account', async () => {
    const { service, prisma } = createService();

    await service.upsertFromLesta(INFO);

    expect(prisma.playerNickname.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ where: { accountId_nickname: { accountId: 42n, nickname: 'Tanker' } } })
    );
  });
});

describe('PlayerResolverService.fetchInfo', () => {
  it('asks Lesta only for the fields a player page reads', async () => {
    const { service, lesta } = createService();

    lesta.account.info.mockResolvedValue({ '42': INFO });

    await expect(service.fetchInfo(42n)).resolves.toMatchObject({ nickname: 'Tanker' });
    expect(lesta.account.info).toHaveBeenCalledWith(expect.objectContaining({ fields: PLAYER_LOOKUP.infoFields }));
  });
});

describe('PlayerResolverService.fetchModeBlocks', () => {
  it('retries without the mode extras when Lesta rejects them', async () => {
    const { service, lesta } = createService();

    lesta.account.info
      .mockRejectedValueOnce(new LestaApiError({ code: 'INVALID_EXTRA', method: 'account/info', field: 'extra' }))
      .mockResolvedValue({ '42': { account_id: 42, statistics: { stronghold_skirmish: BLOCK } } });

    await expect(service.fetchModeBlocks(42n)).resolves.toEqual({ stronghold_skirmish: BLOCK });
    expect(lesta.account.info.mock.calls.map(([input]) => input.extra)).toEqual([PLAYER_LOOKUP.modeExtra, []]);
  });

  it('returns null for an account Lesta does not know', async () => {
    const { service, lesta } = createService();

    lesta.account.info.mockResolvedValue({ '42': null });

    await expect(service.fetchModeBlocks(42n)).resolves.toBeNull();
  });
});
