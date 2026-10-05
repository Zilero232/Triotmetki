import type { Health } from '@otmetki/schemas';

import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';

import type { HealthReport } from '../health.types';

import { PrismaService } from '../../../core';
import { OPENAPI } from '../../../openapi';
import { HEALTH } from '../config/health.constants';
import { healthReportSchema } from '../dto/health.schemas';
import { CollectorStateIndicator } from '../indicators/collector-state.indicator';
import { RedisIndicator } from '../indicators/redis.indicator';
import { CollectorStatusReaderService } from './collector-status-reader.service';

@Injectable()
export class HealthReaderService {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
    private readonly redis: RedisIndicator,
    private readonly collector: CollectorStateIndicator,
    private readonly collectorStatus: CollectorStatusReaderService
  ) {}

  async check(): Promise<Health> {
    const [checked, collector] = await Promise.all([this.indicators(), this.collectorStatus.status()]);

    return { ...checked, collector, build: { version: OPENAPI.version, commit: null } };
  }

  private async indicators(): Promise<HealthReport> {
    return this.health
      .check([
        () => this.prismaIndicator.pingCheck(HEALTH.key.database, this.prisma),
        () => this.redis.ping(),
        () => this.collector.worker(),
        () => this.collector.lestaCircuit()
      ])
      .then(
        (result) => healthReportSchema.parse(result),
        (error: unknown) => {
          if (error instanceof ServiceUnavailableException) {
            return healthReportSchema.parse(error.getResponse());
          }

          throw error;
        }
      );
  }
}
