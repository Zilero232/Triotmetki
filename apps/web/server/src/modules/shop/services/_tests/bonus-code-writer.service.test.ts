import { subDays } from 'date-fns';
import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { BonusCode } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { NotificationService } from '../../../notifications';

import { Prisma } from '../../../../../generated';
import { AppNotFoundException } from '../../../../common/exceptions';
import { BONUS_CODE } from '../../config/bonus-codes.constants';
import { BonusCodeWriterService } from '../bonus-code-writer.service';

const now = new Date('2026-09-25T12:00:00Z');

const discovered = { code: 'MT2026TDAY', title: 'Tankman day', source: BONUS_CODE.wotexpressSource, sourceUrl: null, expiresAt: null };

const row: BonusCode = {
  code: 'MT2026TDAY',
  title: 'Tankman day',
  rewards: null,
  source: BONUS_CODE.wotexpressSource,
  sourceUrl: null,
  status: 'unknown',
  workingReports: 0,
  expiredReports: 0,
  expiresAt: null,
  lastReportAt: null,
  discoveredAt: now
};

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const notifications = mock<NotificationService>();

  return { service: new BonusCodeWriterService(prisma, notifications), prisma, notifications };
};

describe('BonusCodeWriterService.discover', () => {
  it('stores a new code and announces it', async () => {
    const { service, prisma, notifications } = createService();

    prisma.bonusCode.create.mockResolvedValue(row);

    expect(await service.discover(discovered)).toBe(true);
    expect(notifications.bonusCodePublished).toHaveBeenCalledWith({ code: discovered.code, description: discovered.title });
  });

  it('returns false and stays silent for a code seen before', async () => {
    const { service, prisma, notifications } = createService();

    prisma.bonusCode.create.mockRejectedValue(new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' }));

    expect(await service.discover(discovered)).toBe(false);
    expect(notifications.bonusCodePublished).not.toHaveBeenCalled();
  });

  it('lets any other database failure through', async () => {
    const { service, prisma, notifications } = createService();

    prisma.bonusCode.create.mockRejectedValue(new Error('connection lost'));

    await expect(service.discover(discovered)).rejects.toThrow('connection lost');
    expect(notifications.bonusCodePublished).not.toHaveBeenCalled();
  });
});

describe('BonusCodeWriterService.report', () => {
  it('throws for a code the site does not know', async () => {
    const { service, prisma } = createService();

    prisma.bonusCode.findUnique.mockResolvedValue(null);

    await expect(service.report({ userId: 'u1', code: 'NOPE123', verdict: 'working', ip: null })).rejects.toBeInstanceOf(AppNotFoundException);
    expect(prisma.bonusCodeReport.upsert).not.toHaveBeenCalled();
  });
});

describe('BonusCodeWriterService.refreshStatuses', () => {
  it('expires unreported codes past the stale window and recounts the open ones', async () => {
    const { service, prisma } = createService();

    prisma.bonusCode.updateMany.mockResolvedValue({ count: 2 });
    prisma.bonusCode.findMany.mockResolvedValue([row]);

    vi.mocked(prisma.bonusCodeReport.groupBy)
      .mockResolvedValueOnce([
        {
          id: 'report-1',
          code: row.code,
          userId: 'u1',
          verdict: 'working',
          ipHash: null,
          createdAt: now,
          _count: { _all: BONUS_CODE.minReports },
          _min: undefined,
          _max: undefined
        }
      ])
      .mockResolvedValueOnce([
        {
          id: 'report-1',
          code: row.code,
          userId: 'u1',
          verdict: 'working',
          ipHash: null,
          createdAt: now,
          _count: undefined,
          _min: undefined,
          _max: { createdAt: now }
        }
      ]);

    prisma.bonusCode.update.mockResolvedValue(row);

    expect(await service.refreshStatuses(now)).toBe(3);

    const stale = prisma.bonusCode.updateMany.mock.calls[0]?.[0];

    expect(stale?.where?.discoveredAt).toEqual({ lt: subDays(now, BONUS_CODE.staleAfterDays) });
    expect(stale?.where?.lastReportAt).toBeNull();

    expect(prisma.bonusCode.update.mock.calls[0]?.[0]).toMatchObject({
      where: { code: row.code },
      data: { workingReports: BONUS_CODE.minReports, expiredReports: 0, lastReportAt: now, status: 'working' }
    });
  });

  it('counts only the stale codes when nothing is open', async () => {
    const { service, prisma } = createService();

    prisma.bonusCode.updateMany.mockResolvedValue({ count: 4 });
    prisma.bonusCode.findMany.mockResolvedValue([]);

    expect(await service.refreshStatuses(now)).toBe(4);
    expect(prisma.bonusCode.update).not.toHaveBeenCalled();
    expect(prisma.bonusCodeReport.groupBy).not.toHaveBeenCalled();
  });
});
