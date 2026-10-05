import type { Paginated, Session, SessionBattle, SessionListItem, SessionTankDelta } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { shotSchema } from '@otmetki/schemas';
import { firstBy, groupBy, sumBy } from 'remeda';
import { z } from 'zod';

import type { Battle } from '../../../../generated';
import type { SessionBattleInput, SessionDetailInput, SessionsInput } from '../players.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { paginate, ratio, toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { statsBlockFromTotals } from '../lib/stats-block/stats-block';
import { toSessionListItem } from '../mappers/sessions.mappers';

@Injectable()
export class PlayerSessionsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async list({ accountId, limit, offset }: SessionsInput): Promise<Paginated<SessionListItem>> {
    return paginate({
      limit,
      offset,
      fetch: async (window) => {
        const sessions = await this.prisma.playSession.findMany({ where: { accountId }, orderBy: { startedAt: 'desc' }, ...window });

        return sessions.map((session) => toSessionListItem(session));
      },
      count: () => this.prisma.playSession.count({ where: { accountId } })
    });
  }

  async detail({ accountId, sessionId }: SessionDetailInput): Promise<Session> {
    const session = await this.prisma.playSession.findFirst({
      where: { id: sessionId, accountId },
      include: { battleRecords: { orderBy: { startedAt: 'asc' } } }
    });

    if (!session) {
      throw new AppNotFoundException('NOT_FOUND', 'Session not found');
    }

    const arenas = await this.prisma.arena.findMany({
      where: { arenaId: { in: session.battleRecords.map((battle) => battle.arenaId) } },
      select: { arenaId: true, name: true }
    });

    const mapName = new Map(arenas.map((arena) => [arena.arenaId, arena.name]));
    const battles = await Promise.all(session.battleRecords.map((battle) => this.battle({ battle, mapName })));
    const tanks = await this.tankDeltas(session.battleRecords);
    const rated = tanks.filter((tank) => tank.stats.avgDamage !== null);

    return {
      ...toSessionListItem(session),
      accountId: toNumber(session.accountId),
      credits: session.credits,
      tanks,
      battles: session.source === 'mod' ? battles : null,
      best: firstBy(rated, [(tank) => tank.stats.avgDamage ?? 0, 'desc']) ?? null,
      worst: rated.length > 1 ? (firstBy(rated, [(tank) => tank.stats.avgDamage ?? 0, 'asc']) ?? null) : null
    };
  }

  private async tankDeltas(battles: Battle[]): Promise<SessionTankDelta[]> {
    const byTank = groupBy(battles, (battle) => String(battle.tankId));

    return Promise.all(
      Object.values(byTank).map(async (rows) => ({
        vehicle: await this.catalog.summary(rows[0].tankId),
        stats: statsBlockFromTotals({
          battles: rows.length,
          wins: rows.filter((battle) => battle.result === 'win').length,
          damageDealt: sumBy(rows, (battle) => battle.damageDealt),
          frags: sumBy(rows, (battle) => battle.frags),
          spotted: sumBy(rows, (battle) => battle.spotted),
          xp: sumBy(rows, (battle) => battle.xp),
          survived: rows.filter((battle) => battle.survived).length,
          hits: sumBy(rows, (battle) => battle.shotsHit ?? 0),
          shots: sumBy(rows, (battle) => battle.shotsFired ?? 0),
          avgBlocked: ratio({ value: sumBy(rows, (battle) => battle.damageBlocked), by: rows.length }),
          avgAssisted: ratio({ value: sumBy(rows, (battle) => battle.damageAssistedRadio + battle.damageAssistedTrack), by: rows.length })
        })
      }))
    );
  }

  private async battle({ battle, mapName }: SessionBattleInput): Promise<SessionBattle> {
    const shots = z.array(shotSchema).safeParse(battle.shots);

    return {
      id: battle.id,
      arenaUniqueId: battle.arenaUniqueId.toString(),
      vehicle: await this.catalog.summary(battle.tankId),
      arenaId: battle.arenaId,
      mapName: mapName.get(battle.arenaId) ?? battle.arenaId,
      battleType: battle.battleType,
      result: battle.result,
      survived: battle.survived,
      damageDealt: battle.damageDealt,
      damageAssisted: battle.damageAssistedRadio + battle.damageAssistedTrack,
      damageBlocked: battle.damageBlocked,
      spotted: battle.spotted,
      frags: battle.frags,
      xp: battle.xp,
      credits: battle.credits,
      moePercent: battle.moePercent,
      moePercentDelta: battle.moePercentDelta,
      queueTimeSec: battle.queueTimeMs === null ? null : battle.queueTimeMs / 1000,
      durationSec: battle.durationSec,
      shots: shots.success ? shots.data : null,
      startedAt: battle.startedAt.toISOString()
    };
  }
}
