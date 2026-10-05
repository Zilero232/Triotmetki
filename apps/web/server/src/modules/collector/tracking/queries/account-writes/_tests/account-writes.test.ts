import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { Prisma } from '../../../../../../../generated';
import { MODE_STATS_SQL } from '../../../../../../common/lib';
import {
  markSyncedSql,
  touchNicknamesSql,
  updateMarksSql,
  upsertAccountModeStatsSql,
  upsertLatestTanksSql,
  upsertPlayersSql,
  upsertPlayerTanksSql,
  upsertTankModeStatsSql
} from '../account-writes';
import { TANK_SNAPSHOT_COLUMNS } from '../account-writes.constants';

const jsonParam = (sql: Prisma.Sql): unknown[] => {
  const text = sql.values.find((value): value is string => typeof value === 'string' && value.startsWith('['));

  return text ? z.array(z.unknown()).parse(JSON.parse(text)) : [];
};

describe('TANK_SNAPSHOT_COLUMNS', () => {
  it('copies every column of tank_snapshot into tank_snapshot_latest', () => {
    const snapshot = Object.keys(Prisma.TankSnapshotScalarFieldEnum);

    expect(TANK_SNAPSHOT_COLUMNS).toHaveLength(snapshot.length);
    expect(Object.keys(Prisma.TankSnapshotLatestScalarFieldEnum)).toEqual(snapshot);
  });
});

describe('upsertPlayerTanksSql', () => {
  it('sends bigint account ids as snake_case JSON records', () => {
    const sql = upsertPlayerTanksSql([{ accountId: 9_007_199_254_740_993n, tankId: 1, battles: 3, wins: 2, markOfMastery: 1 }]);

    expect(jsonParam(sql)).toEqual([{ account_id: '9007199254740993', tank_id: 1, battles: 3, wins: 2, mark_of_mastery: 1 }]);
  });

  it('never lets an older read lower the stored battle count', () => {
    expect(upsertPlayerTanksSql([]).sql).toContain('WHERE player_tank.battles <= EXCLUDED.battles');
  });

  it('never clears a known garage flag, only raises it for a tank just played', () => {
    expect(upsertPlayerTanksSql([]).sql).toContain('ELSE player_tank.in_garage END');
  });
});

const identity = {
  accountId: 9_007_199_254_740_993n,
  nickname: 'Tanker',
  clanId: null,
  createdAt: new Date('2020-01-01T00:00:00Z'),
  trackingTier: 'active' as const,
  logoutAt: null,
  seenAt: new Date('2026-09-26T12:00:00Z')
};

describe('upsertPlayersSql', () => {
  it('sends bigint account ids as snake_case JSON records', () => {
    expect(jsonParam(upsertPlayersSql([identity]))).toEqual([
      {
        account_id: '9007199254740993',
        nickname: 'Tanker',
        clan_id: null,
        created_at: '2020-01-01T00:00:00.000Z',
        tracking_tier: 'active',
        logout_at: null
      }
    ]);
  });

  it('never clears a known logout time', () => {
    expect(upsertPlayersSql([]).sql).toContain('logout_at = coalesce(EXCLUDED.logout_at, player.logout_at)');
  });

  it('locks the rows in account order so concurrent batches cannot deadlock', () => {
    expect(upsertPlayersSql([]).sql).toContain('ORDER BY r.account_id');
  });
});

describe('touchNicknamesSql', () => {
  it('moves the last-seen time of a known nickname forward', () => {
    expect(touchNicknamesSql([identity]).sql).toContain('DO UPDATE SET last_seen_at = EXCLUDED.last_seen_at');
  });
});

describe('upsertLatestTanksSql', () => {
  it('only replaces a latest row with a newer snapshot', () => {
    expect(upsertLatestTanksSql({ accountId: 1n, capturedAt: new Date() }).sql).toContain('tank_snapshot_latest.captured_at < EXCLUDED.captured_at');
  });
});

describe('markSyncedSql', () => {
  it('writes one record per account', () => {
    const now = new Date('2026-09-24T12:00:00Z');
    const sql = markSyncedSql([
      { accountId: 1, lastBattleAt: null, lastPolledAt: now, nextPollAt: now },
      { accountId: 2, lastBattleAt: now, lastPolledAt: now, nextPollAt: now }
    ]);

    expect(jsonParam(sql)).toHaveLength(2);
  });
});

describe('upsertAccountModeStatsSql', () => {
  it('stores the database name of every mode and never lowers the battle count', () => {
    const sql = upsertAccountModeStatsSql([
      {
        accountId: 1n,
        mode: 'strongholdSkirmish',
        battles: 5,
        wins: 3,
        losses: 2,
        draws: 0,
        damageDealt: 9000n,
        damageReceived: 7000n,
        frags: 4,
        spotted: 3,
        xp: 3000n,
        survived: 2,
        hits: 20,
        shots: 25,
        capturePoints: 0,
        droppedCapturePoints: 0,
        avgDamageBlocked: 100,
        avgDamageAssisted: null,
        maxDamage: null,
        maxXp: null,
        maxFrags: null
      }
    ]);

    expect(jsonParam(sql)).toEqual([expect.objectContaining({ account_id: '1', mode: MODE_STATS_SQL.strongholdSkirmish, damage_dealt: '9000' })]);
    expect(sql.sql).toContain('WHERE account_mode_stats.battles <= EXCLUDED.battles');
  });
});

describe('upsertTankModeStatsSql', () => {
  it('writes one record per tank and mode', () => {
    const row = { accountId: 1n, tankId: 5, battles: 2, wins: 1, damageDealt: 3000, frags: 1, spotted: 0, xp: 900, survived: 1 };
    const sql = upsertTankModeStatsSql([
      { ...row, mode: 'epic' },
      { ...row, mode: 'ranked' }
    ]);

    expect(jsonParam(sql).map((record) => z.object({ mode: z.string() }).parse(record).mode)).toEqual([MODE_STATS_SQL.epic, MODE_STATS_SQL.ranked]);
  });
});

describe('updateMarksSql', () => {
  it('stamps the marks it writes as read from Lesta', () => {
    expect(updateMarksSql([{ accountId: 1n, tankId: 10, marks: 0 }]).sql).toContain("marks_source = 'lesta'");
  });

  it('writes a zero mark instead of skipping it', () => {
    expect(jsonParam(updateMarksSql([{ accountId: 1n, tankId: 10, marks: 0 }]))).toEqual([{ account_id: '1', tank_id: 10, marks: 0 }]);
  });
});
