import type { ModProblemReportReceipt } from '@otmetki/schemas';

import { Inject, Injectable, PayloadTooLargeException } from '@nestjs/common';
import { Redis } from 'ioredis';

import type { SubmitReportInput } from '../mod-reports.types';

import { AppTooManyRequestsException } from '../../../common/exceptions';
import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { MOD_REPORTS_API } from '../config/mod-reports.constants';
import { fitsReportLimits, hashReporter } from '../lib/report-files/report-files';
import { toReportReceipt } from '../mappers/mod-reports.mappers';

@Injectable()
export class ModReportsWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async submit({ body, ip }: SubmitReportInput): Promise<ModProblemReportReceipt> {
    if (!fitsReportLimits(body.files)) {
      throw new PayloadTooLargeException('The attached files are larger than a report may carry');
    }

    const ipHash = hashReporter({ ip, secret: this.config.get('BETTER_AUTH_SECRET') });

    await this.countReport(ipHash);

    const report = await this.prisma.modProblemReport.create({
      data: {
        managerVersion: body.manager_version,
        modpackVersion: body.modpack_version,
        gameVersion: body.game_version,
        message: body.message,
        files: body.files,
        ipHash
      },
      select: { id: true, createdAt: true }
    });

    return toReportReceipt(report);
  }

  private async countReport(ipHash: string): Promise<void> {
    const key = `${MOD_REPORTS_API.dailyKeyPrefix}${ipHash}`;
    const count = await this.redis.incr(key);

    if (count === 1) {
      await this.redis.expire(key, MOD_REPORTS_API.dailyWindowSeconds);
    }

    if (count > MOD_REPORTS_API.dailyCap) {
      throw new AppTooManyRequestsException('RATE_LIMITED', 'Too many problem reports from this address today', await this.redis.ttl(key));
    }
  }
}
