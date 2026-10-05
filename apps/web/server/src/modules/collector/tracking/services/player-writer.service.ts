import { Inject, Injectable } from '@nestjs/common';
import { addDays } from 'date-fns';
import { partition, uniqueBy } from 'remeda';

import type { Prisma } from '../../../../../generated';
import type { MarkSyncedInput, StoredPlayer, UpsertPlayerInput } from '../lib/poll-pipeline';
import type { PlayerIdentityRow, PlayerQueries, SyncedRow } from '../queries/players.types';

import { asPrismaTransaction, PrismaService } from '../../../../core';
import { TRACKING, TRACKING_TOKENS } from '../config/tracking.constants';
import { changesClan, playerIdentity } from '../lib/player-identity';
import { nextPollAt } from '../lib/poll-schedule';
import { toStoredPlayer } from '../mappers/players.mappers';
import { STORED_PLAYER_SELECT } from '../selects/players.selects';
import { TrackingAnnounceService } from './tracking-announce.service';

@Injectable()
export class PlayerWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly announce: TrackingAnnounceService,
    @Inject(TRACKING_TOKENS.playerQueries) private readonly queries: PlayerQueries
  ) {}

  async loadPlayers(accountIds: readonly number[]): Promise<StoredPlayer[]> {
    const players = await this.prisma.player.findMany({ where: { accountId: { in: accountIds.map(BigInt) } }, select: STORED_PLAYER_SELECT });

    return players.map(toStoredPlayer);
  }

  async upsertPlayers(entries: readonly UpsertPlayerInput[]): Promise<void> {
    const distinct = uniqueBy(entries, (entry: UpsertPlayerInput) => entry.info.account_id);
    const [moving, staying] = partition(distinct, (entry) => changesClan(entry));

    if (staying.length > 0) {
      await this.upsertStayingPlayers(staying.map((entry) => ({ ...playerIdentity(entry), seenAt: entry.now })));
    }

    for (const entry of moving) {
      await this.upsertPlayer(entry);
    }
  }

  async upsertPlayer(input: UpsertPlayerInput): Promise<void> {
    const { info, previous, now } = input;
    const { accountId, logoutAt, ...fields } = playerIdentity(input);
    const identity = { ...fields, ...(logoutAt ? { logoutAt } : {}) } satisfies Prisma.PlayerUpdateInput;
    const { clanId } = fields;
    const clanChanged = changesClan(input);

    await this.prisma.$transaction(
      async (tx) => {
        await tx.player.upsert({ where: { accountId }, create: { accountId, ...identity }, update: identity });

        await tx.playerNickname.upsert({
          where: { accountId_nickname: { accountId, nickname: info.nickname } },
          create: { accountId, nickname: info.nickname },
          update: { lastSeenAt: now }
        });

        if (!clanChanged) {
          return;
        }

        if (previous) {
          await tx.playerClanHistory.updateMany({ where: { accountId, leftAt: null }, data: { leftAt: now } });
        }

        if (clanId !== null) {
          await tx.playerClanHistory.create({ data: { accountId, clanId, joinedAt: previous ? now : null } });
        }
      },
      { maxWait: TRACKING.transaction.maxWaitMs, timeout: TRACKING.transaction.timeoutMs }
    );
  }

  async markSynced(entries: readonly MarkSyncedInput[]): Promise<void> {
    const rows = await this.syncedRows(entries);

    if (rows.length > 0) {
      await this.queries.markSynced({ db: this.prisma.$kysely, rows });
    }
  }

  async markMissing(accountIds: readonly number[]): Promise<void> {
    const now = new Date();

    await this.prisma.player.updateMany({
      where: { accountId: { in: accountIds.map(BigInt) } },
      data: { trackingTier: 'dormant', nextPollAt: addDays(now, TRACKING.intervals.dormantDays) }
    });
  }

  private async upsertStayingPlayers(rows: readonly PlayerIdentityRow[]): Promise<void> {
    await this.prisma.$transaction(
      async (client) => {
        const tx = asPrismaTransaction(client);

        await this.queries.upsertPlayers({ db: tx.$kysely, rows });
        await this.queries.touchNicknames({ db: tx.$kysely, rows });
      },
      { maxWait: TRACKING.transaction.maxWaitMs, timeout: TRACKING.transaction.timeoutMs }
    );
  }

  private async syncedRows(entries: readonly MarkSyncedInput[]): Promise<SyncedRow[]> {
    const ids = entries.map((entry) => BigInt(entry.accountId));

    const [players, subscribers] = await Promise.all([
      this.prisma.player.findMany({ where: { accountId: { in: ids } }, select: { accountId: true, trackingTier: true } }),
      this.announce.subscribers(ids)
    ]);

    const tierOf = new Map(players.map((player) => [Number(player.accountId), player.trackingTier]));

    return entries.flatMap(({ accountId, lastBattleAt, now }) => {
      const tier = tierOf.get(accountId);

      if (!tier) {
        return [];
      }

      const isSubscriber = tier === 'active' && subscribers.has(accountId);

      return [{ accountId, lastBattleAt, lastPolledAt: now, nextPollAt: nextPollAt({ now, tier, isSubscriber, intervals: TRACKING.intervals }) }];
    });
  }
}
