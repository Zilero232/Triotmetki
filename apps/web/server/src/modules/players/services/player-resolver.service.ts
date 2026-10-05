import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

import type { Prisma } from '../../../../generated';
import type { LestaClient } from '../../../lib/lesta';
import type { MissingPlayerLookup } from '../lib';
import type { LestaPlayerInfo } from '../players.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { errorMessage, fromUnixSeconds, insensitiveEquals } from '../../../common/lib';
import { LESTA_CLIENT, PrismaService, REDIS } from '../../../core';
import { accountInfoSchema, isExtraRejected, isSearchRejected } from '../../../lib/lesta';
import { CollectorProducerService, PurgeGuardService } from '../../collector';
import { PLAYER_LOOKUP } from '../config';
import { missingPlayerKey } from '../lib';

@Injectable()
export class PlayerResolverService {
  private readonly logger = new Logger(PlayerResolverService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly collector: CollectorProducerService,
    @Inject(LESTA_CLIENT) private readonly lesta: LestaClient,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly purgeGuard: PurgeGuardService
  ) {}

  async resolve(idOrNick: string): Promise<bigint> {
    if (PLAYER_LOOKUP.numericId.test(idOrNick)) {
      return this.ensure(BigInt(idOrNick));
    }

    const local = await this.prisma.player.findFirst({
      where: { nickname: insensitiveEquals(idOrNick) },
      select: { accountId: true, isHidden: true },
      orderBy: { lastBattleAt: { sort: 'desc', nulls: 'last' } }
    });

    if (local) {
      return this.ensure(local.accountId);
    }

    const lookup: MissingPlayerLookup = { kind: 'nickname', value: idOrNick };

    if (await this.isKnownMissing(lookup)) {
      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player named ${idOrNick}`);
    }

    const [found] = await this.lesta.account.list({ search: idOrNick, type: 'exact', limit: 1 }).catch((error: unknown) => {
      if (isSearchRejected(error)) {
        return [];
      }

      throw error;
    });

    if (!found) {
      await this.rememberMissing(lookup);

      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player named ${idOrNick}`);
    }

    return this.ensure(BigInt(found.account_id));
  }

  async ensure(accountId: bigint): Promise<bigint> {
    const player = await this.prisma.player.findUnique({ where: { accountId }, select: { accountId: true, isHidden: true } });

    if (player?.isHidden) {
      throw new AppNotFoundException('LESTA_ACCOUNT_HIDDEN', 'This player asked for their data to be hidden');
    }

    if (player) {
      this.touch(accountId);

      return accountId;
    }

    const blocked = await this.purgeGuard.blocked([Number(accountId)]);

    if (blocked.size > 0) {
      throw new AppNotFoundException('LESTA_ACCOUNT_HIDDEN', 'This player asked for their data to be deleted');
    }

    const lookup: MissingPlayerLookup = { kind: 'id', value: String(accountId) };

    if (await this.isKnownMissing(lookup)) {
      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player with id ${accountId}`);
    }

    const info = await this.fetchInfo(accountId);

    if (!info) {
      await this.rememberMissing(lookup);

      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player with id ${accountId}`);
    }

    await this.upsertFromLesta(info);
    await this.collector.enrol({ accountId: Number(accountId), priority: 'high', reason: 'view' });

    return accountId;
  }

  async fetchInfo(accountId: bigint): Promise<LestaPlayerInfo | null> {
    const response = await this.lesta.account.info({
      accountIds: [Number(accountId)],
      extra: PLAYER_LOOKUP.infoExtra,
      fields: PLAYER_LOOKUP.infoFields
    });

    const info = response[String(accountId)];

    return info ? accountInfoSchema.parse(info) : null;
  }

  async fetchModeBlocks(accountId: bigint): Promise<Record<string, unknown> | null> {
    const request = (extra: readonly string[]) =>
      this.lesta.account.info({ accountIds: [Number(accountId)], extra, fields: PLAYER_LOOKUP.modeFields });

    const response = await request(PLAYER_LOOKUP.modeExtra).catch(async (error: unknown) => {
      if (!isExtraRejected(error)) {
        throw error;
      }

      return request([]);
    });

    const statistics = response[String(accountId)]?.statistics;

    return statistics ? { ...statistics } : null;
  }

  async upsertFromLesta(info: LestaPlayerInfo): Promise<void> {
    const accountId = BigInt(info.account_id);
    const data = {
      nickname: info.nickname,
      clanId: info.clan_id === null ? null : BigInt(info.clan_id),
      createdAt: fromUnixSeconds(info.created_at),
      lastBattleAt: fromUnixSeconds(info.last_battle_time),
      logoutAt: info.logout_at ? fromUnixSeconds(info.logout_at) : undefined
    } satisfies Prisma.PlayerUpdateInput;

    await this.prisma.player.upsert({
      where: { accountId },
      create: { accountId, ...data },
      update: data
    });

    await this.prisma.playerNickname.upsert({
      where: { accountId_nickname: { accountId, nickname: info.nickname } },
      create: { accountId, nickname: info.nickname },
      update: { lastSeenAt: new Date() }
    });
  }

  private async isKnownMissing(lookup: MissingPlayerLookup): Promise<boolean> {
    const marker = await this.redis.get(missingPlayerKey(lookup)).catch((error: unknown) => {
      this.logger.warn(`Missing-player cache unavailable: ${errorMessage(error)}`);

      return null;
    });

    return marker !== null;
  }

  private async rememberMissing(lookup: MissingPlayerLookup): Promise<void> {
    await this.redis.set(missingPlayerKey(lookup), PLAYER_LOOKUP.missingMarker, 'EX', PLAYER_LOOKUP.missingTtlSeconds).catch((error: unknown) => {
      this.logger.warn(`Missing player not cached: ${errorMessage(error)}`);
    });
  }

  private touch(accountId: bigint) {
    void this.recordView(accountId).catch((error: unknown) => {
      this.logger.debug(`lastViewedAt of ${accountId} not updated: ${errorMessage(error)}`);
    });
  }

  private async recordView(accountId: bigint): Promise<void> {
    const claimed = await this.redis.set(
      `${PLAYER_LOOKUP.viewTouchKeyPrefix}${accountId}`,
      PLAYER_LOOKUP.viewTouchMarker,
      'EX',
      PLAYER_LOOKUP.viewTouchSeconds,
      'NX'
    );

    if (claimed === null) {
      return;
    }

    await this.prisma.player.update({ where: { accountId }, data: { lastViewedAt: new Date() } });
  }
}
