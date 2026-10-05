import type { CareerModeLine, CareerModes, PlayerCareer, PlayerRecord } from '@otmetki/schemas';

import { Injectable, Logger } from '@nestjs/common';
import { MODE_META } from '@otmetki/schemas';
import { entries, groupBy, sortBy } from 'remeda';

import type { CareerSource } from '../../collector';
import type { CareerModesInput, CareerRecordInput, CareerRecordsInput, StoredCareerLineInput } from '../players.types';
import type { CareerRecordTimes } from '../selects';

import { AppNotFoundException } from '../../../common/exceptions';
import { errorMessage, toIso, toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { ACCOUNT_MODE_SOURCES, careerSourceFromBlock, MODE_STATS_MODES, modeBlockOf } from '../../collector';
import { VehicleCatalogService } from '../../reference';
import { PLAYER_STATS } from '../config';
import { achievedAt } from '../lib';
import { careerRecordRefs, careerTotalsFromBlock, careerTotalsFromStored, toCareerModeLine, toCareerModeTank, toPlayerAssist } from '../mappers';
import { CAREER_RECORD_TIMES_SELECT } from '../selects';
import { PlayerResolverService } from './player-resolver.service';

@Injectable()
export class PlayerCareerReaderService {
  private readonly logger = new Logger(PlayerCareerReaderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly resolver: PlayerResolverService,
    private readonly catalog: VehicleCatalogService
  ) {}

  async career(accountId: bigint): Promise<PlayerCareer> {
    const [player, snapshot] = await Promise.all([
      this.prisma.player.findUnique({ where: { accountId }, select: { lastBattleAt: true, logoutAt: true } }),
      this.prisma.accountSnapshot.findFirst({ where: { accountId, mode: PLAYER_STATS.snapshotMode }, orderBy: { capturedAt: 'desc' } })
    ]);

    if (!player) {
      throw new AppNotFoundException('PLAYER_NOT_FOUND', `No player with id ${accountId}`);
    }

    const source: CareerSource | null = snapshot ?? (await this.liveSource(accountId));
    const isStored = snapshot !== null;

    return {
      accountId: toNumber(accountId),
      source: isStored ? 'stored' : 'live',
      records: await this.records({ accountId, source, isStored }),
      assist: source ? toPlayerAssist(source) : null,
      lastBattleAt: toIso(player.lastBattleAt),
      logoutAt: toIso(player.logoutAt)
    };
  }

  async modes({ accountId, allowLive }: CareerModesInput): Promise<CareerModes> {
    const [stored, tankRows] = await Promise.all([
      this.prisma.accountModeStats.findMany({ where: { accountId, mode: { in: MODE_STATS_MODES } } }),
      this.prisma.tankModeStats.findMany({ where: { accountId }, orderBy: { battles: 'desc' } })
    ]);

    if (stored.length > 0) {
      const tanksByMode = groupBy(tankRows, (row) => row.mode);

      const modes = await Promise.all(
        MODE_STATS_MODES.flatMap((mode) => {
          const row = stored.find((entry) => entry.mode === mode);

          return row ? [this.storedLine({ mode, totals: careerTotalsFromStored(row), rows: tanksByMode[mode] ?? [] })] : [];
        })
      );

      return { accountId: toNumber(accountId), source: 'stored', modes: sortBy(modes, [(line) => line.battles, 'desc']) };
    }

    const blocks = allowLive ? await this.liveModeBlocks(accountId) : null;

    if (!blocks) {
      return { accountId: toNumber(accountId), source: 'none', modes: [] };
    }

    const modes = entries(ACCOUNT_MODE_SOURCES).flatMap(([mode, keys]) => {
      const block = modeBlockOf({ source: blocks, keys });

      return block ? [toCareerModeLine({ mode, totals: careerTotalsFromBlock(block), tanks: [] })] : [];
    });

    return { accountId: toNumber(accountId), source: 'live', modes: sortBy(modes, [(line) => line.battles, 'desc']) };
  }

  private async storedLine({ mode, totals, rows }: StoredCareerLineInput): Promise<CareerModeLine> {
    const tanks = await Promise.all(
      rows.slice(0, MODE_META.careerTanks).map(async (row) => toCareerModeTank({ vehicle: await this.catalog.summary(row.tankId), row }))
    );

    return toCareerModeLine({ mode, totals, tanks });
  }

  private async liveModeBlocks(accountId: bigint): Promise<Record<string, unknown> | null> {
    try {
      return await this.resolver.fetchModeBlocks(accountId);
    } catch (error) {
      this.logger.warn(`live mode stats of ${accountId} unavailable: ${errorMessage(error)}`);

      return null;
    }
  }

  private async liveSource(accountId: bigint): Promise<CareerSource | null> {
    try {
      const info = await this.resolver.fetchInfo(accountId);
      const block = info?.statistics.random ?? info?.statistics.all;

      return block ? careerSourceFromBlock(block) : null;
    } catch (error) {
      this.logger.warn(`live career of ${accountId} unavailable: ${errorMessage(error)}`);

      return null;
    }
  }

  private async records({ accountId, source, isStored }: CareerRecordsInput): Promise<PlayerCareer['records']> {
    const times = isStored ? await this.recordTimes(accountId) : null;
    const found = new Map(
      await Promise.all((source ? careerRecordRefs(source) : []).map(async (ref) => [ref.key, await this.record({ ref, times })] as const))
    );

    return { maxDamage: found.get('maxDamage') ?? null, maxXp: found.get('maxXp') ?? null, maxFrags: found.get('maxFrags') ?? null };
  }

  private async record({ ref, times }: CareerRecordInput): Promise<PlayerRecord> {
    return {
      value: ref.value,
      vehicle: ref.tankId === null ? null : await this.catalog.summary(ref.tankId),
      achievedAt: times ? achievedAt({ key: ref.key, value: ref.value, times }) : null
    };
  }

  private async recordTimes(accountId: bigint): Promise<CareerRecordTimes | null> {
    return this.prisma.accountModeStats.findUnique({
      where: { accountId_mode: { accountId, mode: PLAYER_STATS.snapshotMode } },
      select: CAREER_RECORD_TIMES_SELECT
    });
  }
}
