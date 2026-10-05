import type { ApiErrorLogEntry, ApiUsage } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { subDays } from 'date-fns';

import type { OwnedKeyInput, UsageInput } from '../developer.types';

import { isoDay } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { API_TIERS } from '../config/api-keys.constants';
import { API_USAGE_REPORT } from '../config/api-usage.constants';
import { topEndpoints, usagePointOf, usagePoints } from '../lib/usage/usage';
import { toApiErrorLogEntry, toUsageRow } from '../mappers/api-usage.mappers';
import { ApiKeysWriterService } from './api-keys-writer.service';
import { ApiTierReaderService } from './api-tier-reader.service';

@Injectable()
export class ApiUsageReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly keys: ApiKeysWriterService,
    private readonly tiers: ApiTierReaderService
  ) {}

  async usage({ userId, id, days }: UsageInput): Promise<ApiUsage> {
    await this.keys.owned({ userId, id });

    const tier = await this.tiers.tierFor(userId);
    const from = new Date(isoDay(subDays(new Date(), days - 1)));
    const rows = await this.prisma.apiUsageDaily.findMany({ where: { apiKeyId: id, day: { gte: from } }, orderBy: { day: 'asc' } });

    const usageRows = rows.map(toUsageRow);

    return {
      apiKeyId: id,
      tier,
      limits: API_TIERS[tier],
      today: usagePointOf({ rows: usageRows, day: isoDay(new Date()) }),
      history: usagePoints(usageRows),
      topEndpoints: topEndpoints(usageRows)
    };
  }

  async errors({ userId, id }: OwnedKeyInput): Promise<ApiErrorLogEntry[]> {
    await this.keys.owned({ userId, id });

    const rows = await this.prisma.apiErrorLog.findMany({
      where: { apiKeyId: id },
      orderBy: { occurredAt: 'desc' },
      take: API_USAGE_REPORT.errorLogLimit
    });

    return rows.map(toApiErrorLogEntry);
  }
}
