import { Injectable } from '@nestjs/common';
import { challengeConditionSchema } from '@otmetki/schemas';

import type { AccountTankInput, BuildOverlayDataInput, OverlayData } from '../overlays.types';

import { percentOf, readRecord, toNumber } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { VehicleCatalogService } from '../../../reference';
import { winStreak } from '../lib/overlay-data/overlay-data';

@Injectable()
export class OverlayStatsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async build({ userId, accountId, kind, name, config }: BuildOverlayDataInput): Promise<OverlayData> {
    const base = { kind, name, config, isPaused: false, updatedAt: new Date().toISOString() };

    if (accountId === null) {
      return { ...base, player: null, session: null, overall: null, moe: null, challenge: await this.challenge(userId) };
    }

    const [player, overall, session, challenge] = await Promise.all([
      this.prisma.player.findUnique({ where: { accountId }, select: { nickname: true } }),
      this.prisma.accountRating.findUnique({ where: { accountId_period: { accountId, period: 'overall' } } }),
      this.session(accountId),
      this.challenge(userId)
    ]);

    return {
      ...base,
      player: player ? { accountId: toNumber(accountId), nickname: player.nickname } : null,
      overall: overall ? { battles: overall.battles, winRate: overall.winRate, wn8: overall.wn8, broneIndex: overall.broneIndex } : null,
      session: session?.view ?? null,
      moe: session?.lastTankId ? await this.moe({ accountId, tankId: session.lastTankId }) : null,
      challenge
    };
  }

  private async session(accountId: bigint) {
    const session = await this.prisma.playSession.findFirst({ where: { accountId, battles: { gt: 0 } }, orderBy: { startedAt: 'desc' } });

    if (!session) {
      return null;
    }

    const battles = await this.prisma.battle.findMany({
      where: { sessionId: session.id },
      orderBy: { startedAt: 'desc' },
      select: { tankId: true, result: true, damageDealt: true }
    });

    const [last] = battles;
    const vehicle = last ? await this.catalog.summary(last.tankId) : null;

    return {
      lastTankId: last?.tankId ?? null,
      view: {
        battles: session.battles,
        wins: session.wins,
        winRate: percentOf({ value: session.wins, by: session.battles }),
        avgDamage: session.battles > 0 ? session.damageDealt / session.battles : null,
        frags: session.frags,
        wn8: session.wn8,
        broneIndex: session.broneIndex,
        winStreak: winStreak({ results: battles.map((battle) => battle.result) }),
        lastBattle:
          last && vehicle ? { tankId: last.tankId, tankName: vehicle.shortName || vehicle.name, result: last.result, damage: last.damageDealt } : null
      }
    };
  }

  private async moe({ accountId, tankId }: AccountTankInput) {
    const [progress, vehicle] = await Promise.all([
      this.prisma.playerTank.findUnique({
        where: { accountId_tankId: { accountId, tankId } },
        select: { marksOnGun: true, moePercent: true }
      }),
      this.catalog.summary(tankId)
    ]);

    return !progress || progress.moePercent === null
      ? null
      : { tankName: vehicle.shortName || vehicle.name, marks: progress.marksOnGun ?? 0, percent: progress.moePercent };
  }

  private async challenge(streamerUserId: string) {
    const challenge = await this.prisma.challenge.findFirst({
      where: { streamerUserId, status: { in: ['active', 'pending'] } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
    });

    if (!challenge) {
      return null;
    }

    const condition = challengeConditionSchema.safeParse(challenge.condition);
    const progress = readRecord(challenge.progress);

    return {
      title: challenge.title,
      code: challenge.code,
      status: challenge.status,
      battles: typeof progress.battles === 'number' ? progress.battles : 0,
      battlesNeeded: condition.success ? condition.data.battles : 1,
      value: typeof progress.value === 'number' ? progress.value : 0,
      target: condition.success ? condition.data.value : 0
    };
  }
}
