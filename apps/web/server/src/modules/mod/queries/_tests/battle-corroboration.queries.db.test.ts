import { afterAll, beforeEach, expect, it } from 'vitest';

import type { Prisma } from '../../../../../generated';

import { ARENA_BONUS_TYPE } from '../../../../common/lib';
import { createTestPrisma, describeWithDatabase, truncateTables } from '../../../../core/prisma/_tests/test-database';
import { BATTLE_CORROBORATION } from '../../config/ingest.constants';
import { corroboratedBattle, ownerTrustedBattle } from '../battle-corroboration.queries';

const SEED = {
  accountId: 10_001n,
  tankId: 1,
  damageDealt: 2000,
  frags: 2,
  startedAt: new Date('2026-10-01T12:00:00Z'),
  ownerId: 'owner',
  strangerId: 'stranger',
  deviceId: 'dev_reporter',
  random: String(ARENA_BONUS_TYPE.regular),
  ranked: String(ARENA_BONUS_TYPE.ranked)
} as const;

const hoursAfterStart = (hours: number) => new Date(SEED.startedAt.getTime() + hours * 3_600_000);

describeWithDatabase('battle corroboration', () => {
  const prisma = createTestPrisma();

  const battle = async ({ arenaUniqueId, battleType = SEED.random }: { arenaUniqueId: bigint; battleType?: string }) =>
    prisma.battle.create({
      data: {
        accountId: SEED.accountId,
        deviceId: SEED.deviceId,
        arenaUniqueId,
        tankId: SEED.tankId,
        arenaId: 'map',
        battleType,
        result: 'win',
        damageDealt: SEED.damageDealt,
        damageAssistedRadio: 0,
        damageAssistedTrack: 0,
        damageAssistedStun: 0,
        damageBlocked: 0,
        damageReceived: 0,
        spotted: 0,
        frags: SEED.frags,
        xp: 0,
        survived: true,
        startedAt: SEED.startedAt
      },
      select: { arenaUniqueId: true }
    });

  const delta = ({
    capturedAt,
    battles = 1,
    damageDealt = SEED.damageDealt,
    frags = SEED.frags
  }: {
    capturedAt: Date;
    battles?: number;
    damageDealt?: number;
    frags?: number;
  }) =>
    prisma.tankBattleDelta.create({
      data: {
        accountId: SEED.accountId,
        tankId: SEED.tankId,
        capturedAt,
        mode: 'random',
        cohort: 'average',
        accountWinRate: 50,
        battles,
        wins: battles,
        damageDealt,
        damageBlocked: 0,
        frags,
        spotted: 0,
        xp: 0,
        survived: 0,
        hits: 0,
        shots: 0,
        capturePoints: 0,
        droppedCapturePoints: 0
      }
    });

  const witness = (arenaUniqueId: bigint, overrides: Partial<Prisma.ReplayUncheckedCreateInput> = {}) =>
    prisma.replay.create({
      data: {
        storageKey: `replay-${arenaUniqueId}-${overrides.uploaderUserId ?? SEED.strangerId}`,
        fileName: `${arenaUniqueId}.mtreplay`,
        fileSize: 1,
        sha256: `sha-${arenaUniqueId}-${overrides.uploaderUserId ?? SEED.strangerId}`,
        uploaderUserId: SEED.strangerId,
        status: 'parsed',
        arenaUniqueId,
        accountId: SEED.accountId,
        damageDealt: SEED.damageDealt,
        playerAccountIds: [],
        ...overrides
      }
    });

  const corroborated = async () => {
    const rows = await prisma.$kysely.selectFrom('battle').select('arena_unique_id').where(corroboratedBattle).orderBy('arena_unique_id').execute();

    return rows.map((row) => row.arena_unique_id);
  };

  const ownerTrusted = async () => {
    const rows = await prisma.$kysely.selectFrom('battle').select('arena_unique_id').where(ownerTrustedBattle).orderBy('arena_unique_id').execute();

    return rows.map((row) => row.arena_unique_id);
  };

  beforeEach(async () => {
    await truncateTables({ prisma, tables: ['battle', 'tank_battle_delta', 'replay', 'mod_device', 'user_lesta_account', 'player', 'user'] });

    await prisma.user.createMany({
      data: [
        { id: SEED.ownerId, name: 'Owner', email: 'owner@example.test' },
        { id: SEED.strangerId, name: 'Stranger', email: 'stranger@example.test' }
      ]
    });

    await prisma.player.create({ data: { accountId: SEED.accountId, nickname: 'Reporter' } });
    await prisma.userLestaAccount.create({ data: { userId: SEED.ownerId, accountId: SEED.accountId } });
    await prisma.modDevice.create({ data: { id: SEED.deviceId, userId: SEED.ownerId, accountId: SEED.accountId, secretHash: 'hash' } });
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('keeps a random battle the collector deltas cover inside the window', async () => {
    await battle({ arenaUniqueId: 1n });
    await delta({ capturedAt: hoursAfterStart(1) });

    expect(await corroborated()).toEqual([1]);
  });

  it('drops a random battle whose only delta lands after the window', async () => {
    await battle({ arenaUniqueId: 1n });
    await delta({ capturedAt: hoursAfterStart(BATTLE_CORROBORATION.windowHours) });

    expect(await corroborated()).toEqual([]);
  });

  it('drops a random battle whose delta shows less damage, fewer frags or no battle', async () => {
    await battle({ arenaUniqueId: 1n });
    await delta({ capturedAt: hoursAfterStart(1), damageDealt: SEED.damageDealt - 1 });
    await delta({ capturedAt: hoursAfterStart(2), frags: SEED.frags - 1 });
    await delta({ capturedAt: hoursAfterStart(3), battles: 0 });

    expect(await corroborated()).toEqual([]);
  });

  it('does not take a delta as evidence for a battle type the collector does not cover', async () => {
    await battle({ arenaUniqueId: 1n, battleType: SEED.ranked });
    await delta({ capturedAt: hoursAfterStart(1) });

    expect(await corroborated()).toEqual([]);
  });

  it('keeps a battle a stranger replay shows with the same damage for the account', async () => {
    await battle({ arenaUniqueId: 1n });
    await witness(1n);

    expect(await corroborated()).toEqual([1]);
  });

  it('keeps a battle a stranger replay lists among its players with the same damage', async () => {
    await battle({ arenaUniqueId: 1n });

    await witness(1n, {
      accountId: 99n,
      damageDealt: 1,
      playerAccountIds: [99n, SEED.accountId],
      summary: {
        players: [
          { accountId: 99, result: { damageDealt: 1 } },
          { accountId: Number(SEED.accountId), result: { damageDealt: SEED.damageDealt } }
        ]
      }
    });

    expect(await corroborated()).toEqual([1]);
  });

  it('refuses a player-list replay whose damage differs or whose players are not a list', async () => {
    await battle({ arenaUniqueId: 1n });
    await battle({ arenaUniqueId: 2n });

    await witness(1n, {
      accountId: 99n,
      playerAccountIds: [SEED.accountId],
      summary: { players: [{ accountId: Number(SEED.accountId), result: { damageDealt: SEED.damageDealt + 1 } }] }
    });

    await witness(2n, { accountId: 99n, playerAccountIds: [SEED.accountId], summary: { players: { accountId: Number(SEED.accountId) } } });

    expect(await corroborated()).toEqual([]);
  });

  it('refuses a replay uploaded by the owner of the account or of the reporting device', async () => {
    await battle({ arenaUniqueId: 1n });
    await witness(1n, { uploaderUserId: SEED.ownerId });

    expect(await corroborated()).toEqual([]);
  });

  it('refuses a replay that is not parsed or has no uploader', async () => {
    await battle({ arenaUniqueId: 1n });
    await battle({ arenaUniqueId: 2n });
    await witness(1n, { status: 'uploaded' });
    await witness(2n, { uploaderUserId: null, storageKey: 'replay-2-anonymous', sha256: 'sha-2-anonymous' });

    expect(await corroborated()).toEqual([]);
  });

  it('trusts an uncorroborated battle on the owner pages only when the collector does not cover its type', async () => {
    await battle({ arenaUniqueId: 1n });
    await battle({ arenaUniqueId: 2n, battleType: SEED.ranked });

    expect(await ownerTrusted()).toEqual([2]);
  });

  it('still trusts a corroborated random battle on the owner pages', async () => {
    await battle({ arenaUniqueId: 1n });
    await delta({ capturedAt: hoursAfterStart(1) });

    expect(await ownerTrusted()).toEqual([1]);
  });
});
