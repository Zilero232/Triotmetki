import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';
import { createHash } from 'node:crypto';

import type { ReportTally } from '../lib/bonus-status/bonus-status.types';
import type { BonusCodeView, DiscoverBonusCodeInput, ListBonusCodesInput, RecountInput, ReportBonusCodeInput, TalliesInput } from '../shop.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { isUniqueViolation, PrismaService } from '../../../core';
import { NotificationService } from '../../notifications';
import { BONUS_CODE } from '../config/bonus-codes.constants';
import { VERDICT_TO_DB } from '../config/enum-mapping.constants';
import { reportedStatus, reportTallies } from '../lib/bonus-status/bonus-status';
import { toBonusCodeView } from '../mappers/shop-views.mappers';

@Injectable()
export class BonusCodeWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationService
  ) {}

  async list({ status }: ListBonusCodesInput): Promise<BonusCodeView[]> {
    const rows = await this.prisma.bonusCode.findMany({
      where: status ? { status } : {},
      orderBy: [{ discoveredAt: 'desc' }, { code: 'asc' }],
      take: BONUS_CODE.listLimit
    });

    return rows.map(toBonusCodeView);
  }

  async discover({ code, title, source, sourceUrl, expiresAt }: DiscoverBonusCodeInput): Promise<boolean> {
    try {
      await this.prisma.bonusCode.create({ data: { code, title, source, sourceUrl, expiresAt } });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return false;
      }

      throw error;
    }

    await this.notifications.bonusCodePublished({ code, description: title });

    return true;
  }

  async report({ userId, code, verdict, ip }: ReportBonusCodeInput): Promise<BonusCodeView> {
    const exists = await this.prisma.bonusCode.findUnique({ where: { code }, select: { code: true } });

    if (!exists) {
      throw new AppNotFoundException('NOT_FOUND', `Unknown bonus code ${code}`);
    }

    const ipHash = ip ? createHash('sha256').update(ip).digest('hex') : null;

    await this.prisma.bonusCodeReport.upsert({
      where: { code_userId: { code, userId } },
      create: { code, userId, verdict: VERDICT_TO_DB[verdict], ipHash },
      update: { verdict: VERDICT_TO_DB[verdict], ipHash, createdAt: new Date() }
    });

    return toBonusCodeView(await this.recount({ code, now: new Date() }));
  }

  async refreshStatuses(now: Date): Promise<number> {
    const staleBefore = subDays(now, BONUS_CODE.staleAfterDays);
    const stale = await this.prisma.bonusCode.updateMany({
      where: { status: { not: 'expired' }, discoveredAt: { lt: staleBefore }, lastReportAt: null },
      data: { status: 'expired' }
    });

    const open = await this.prisma.bonusCode.findMany({ where: { status: { not: 'expired' } }, select: { code: true, expiresAt: true } });

    if (open.length > 0) {
      const tallies = await this.tallies({ codes: open.map(({ code }) => code), now });

      await this.prisma.$transaction(
        open.map(({ code, expiresAt }) =>
          this.prisma.bonusCode.update({ where: { code }, data: reportedStatus({ tally: tallies.get(code), expiresAt, now }) })
        )
      );
    }

    return stale.count + open.length;
  }

  private async recount({ code, now }: RecountInput) {
    const [tallies, current] = await Promise.all([
      this.tallies({ codes: [code], now }),
      this.prisma.bonusCode.findUniqueOrThrow({ where: { code }, select: { expiresAt: true } })
    ]);

    return this.prisma.bonusCode.update({
      where: { code },
      data: reportedStatus({ tally: tallies.get(code), expiresAt: current.expiresAt, now })
    });
  }

  private async tallies({ codes, now }: TalliesInput): Promise<Map<string, ReportTally>> {
    const [counts, latest] = await Promise.all([
      this.prisma.bonusCodeReport.groupBy({
        by: ['code', 'verdict'],
        where: { code: { in: codes }, createdAt: { gte: subDays(now, BONUS_CODE.reportWindowDays) } },
        _count: { _all: true }
      }),
      this.prisma.bonusCodeReport.groupBy({ by: ['code'], where: { code: { in: codes } }, _max: { createdAt: true } })
    ]);

    return reportTallies({
      counts: counts.map((row) => ({ code: row.code, verdict: row.verdict, count: row._count._all })),
      latest: latest.map((row) => ({ code: row.code, createdAt: row._max.createdAt }))
    });
  }
}
