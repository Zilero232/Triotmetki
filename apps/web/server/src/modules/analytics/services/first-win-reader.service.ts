import type { FirstWin } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { sortBy } from 'remeda';

import type { AccountInput, TakenInput } from '../analytics.types';

import { toIso } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { VehicleCatalogService } from '../../reference';
import { FIRST_WIN } from '../config/playlist.constants';
import { dailyWindow } from '../lib/daily-reset/daily-reset';
import { OwnAccountReaderService } from './own-account-reader.service';

@Injectable()
export class FirstWinReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly catalog: VehicleCatalogService,
    private readonly accounts: OwnAccountReaderService
  ) {}

  async taken({ accountId, since }: TakenInput): Promise<Set<number>> {
    const [deltas, battles] = await Promise.all([
      this.prisma.tankBattleDelta.findMany({
        where: { accountId, mode: { in: [...FIRST_WIN.modes] }, capturedAt: { gte: since }, wins: { gt: 0 } },
        select: { tankId: true }
      }),
      this.prisma.battle.findMany({
        where: { accountId, battleType: FIRST_WIN.randomBattleType, startedAt: { gte: since }, result: 'win' },
        select: { tankId: true }
      })
    ]);

    return new Set([...deltas, ...battles].map((row) => row.tankId));
  }

  async status(input: AccountInput): Promise<FirstWin> {
    const { resetAt, nextResetAt } = dailyWindow(new Date());
    const window = { resetAt: resetAt.toISOString(), nextResetAt: nextResetAt.toISOString() };
    const accountId = await this.accounts.find(input);

    if (accountId === null) {
      return { accountId: null, state: 'noLink', ...window, taken: 0, available: 0, tanks: [] };
    }

    return { accountId: Number(accountId), ...window, ...(await this.garage({ accountId, since: resetAt })) };
  }

  async availableCount({ accountId, since }: TakenInput): Promise<number> {
    const { available } = await this.garage({ accountId, since });

    return available;
  }

  private async garage({ accountId, since }: TakenInput): Promise<Pick<FirstWin, 'available' | 'state' | 'taken' | 'tanks'>> {
    const [tanks, taken, catalog] = await Promise.all([
      this.prisma.playerTank.findMany({ where: { accountId, inGarage: true }, select: { tankId: true, lastBattleAt: true } }),
      this.taken({ accountId, since }),
      this.catalog.all()
    ]);

    const items = tanks.flatMap((tank) => {
      const vehicle = catalog.get(tank.tankId)?.summary;

      return vehicle ? [{ vehicle, isTaken: taken.has(tank.tankId), lastBattleAt: toIso(tank.lastBattleAt) }] : [];
    });

    if (items.length === 0) {
      return { state: 'noGarage', taken: 0, available: 0, tanks: [] };
    }

    const takenCount = items.filter((item) => item.isTaken).length;

    return {
      state: 'ready',
      taken: takenCount,
      available: items.length - takenCount,
      tanks: sortBy(
        items,
        [(item) => (item.isTaken ? 1 : 0), 'asc'],
        [(item) => item.vehicle.tier, 'desc'],
        [(item) => item.lastBattleAt ?? '', 'desc']
      )
    };
  }
}
