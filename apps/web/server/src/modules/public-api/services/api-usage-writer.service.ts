import type { OnModuleDestroy, OnModuleInit } from '@nestjs/common';

import { Injectable, Logger } from '@nestjs/common';

import type { AddUsageInput, LogErrorInput, RecordThrottledInput, RecordUsageInput, UsageBufferEntry } from '../public-api.types';

import { errorMessage, isoDay } from '../../../common/lib';
import { isPrismaRequestError, PrismaService } from '../../../core';
import { API_USAGE } from '../config/public-api.constants';
import { addCounters, emptyCounters } from '../lib/usage-counters/usage-counters';

@Injectable()
export class ApiUsageWriterService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ApiUsageWriterService.name);
  private buffer = new Map<string, UsageBufferEntry>();
  private timer: NodeJS.Timeout | null = null;

  constructor(private readonly prisma: PrismaService) {}

  onModuleInit() {
    this.timer = setInterval(() => void this.flush(), API_USAGE.flushIntervalMs);
    this.timer.unref();
  }

  async onModuleDestroy() {
    if (this.timer) {
      clearInterval(this.timer);
    }

    await this.flush();
  }

  record({ keyId, endpoint, latencyMs, failed }: RecordUsageInput): void {
    this.add({ keyId, endpoint, counters: { requests: 1, errors: failed ? 1 : 0, throttled: 0, latencyMs: Math.max(0, Math.round(latencyMs)) } });
  }

  recordThrottled({ keyId, endpoint }: RecordThrottledInput): void {
    this.add({ keyId, endpoint, counters: { ...emptyCounters(), throttled: 1 } });
  }

  logError({ keyId, method, path, status, code, message }: LogErrorInput): void {
    void this.prisma.apiErrorLog
      .create({ data: { apiKeyId: keyId, method, path, status, code, message: message?.slice(0, API_USAGE.errorMessageMaxLength) ?? null } })
      .catch((error: unknown) => {
        this.logger.warn(`API error for key ${keyId} not logged: ${errorMessage(error)}`);
      });
  }

  async flush(): Promise<void> {
    const pending = [...this.buffer.values()];

    this.buffer = new Map();

    const failures: unknown[] = [];

    for (const entry of pending) {
      const { requests, errors, throttled, latencyMs } = entry.counters;
      const day = new Date(entry.day);

      try {
        await this.prisma.apiUsageDaily.upsert({
          where: { apiKeyId_day_endpoint: { apiKeyId: entry.keyId, day, endpoint: entry.endpoint } },
          create: { apiKeyId: entry.keyId, day, endpoint: entry.endpoint, requests, errors, throttled, latencyMsTotal: BigInt(latencyMs) },
          update: {
            requests: { increment: requests },
            errors: { increment: errors },
            throttled: { increment: throttled },
            latencyMsTotal: { increment: BigInt(latencyMs) }
          }
        });
      } catch (error) {
        failures.push(error);

        if (!isPrismaRequestError(error)) {
          this.merge(entry);
        }
      }
    }

    if (failures.length > 0) {
      this.logger.warn(`${failures.length} of ${pending.length} API usage rows not flushed: ${errorMessage(failures.at(-1))}`);
    }
  }

  private add({ keyId, endpoint, counters }: AddUsageInput): void {
    this.merge({ keyId, endpoint, counters, day: isoDay(new Date()) });
  }

  private merge({ keyId, endpoint, counters, day }: UsageBufferEntry): void {
    const bufferKey = `${keyId}|${day}|${endpoint}`;
    const current = this.buffer.get(bufferKey);

    this.buffer.set(bufferKey, { keyId, day, endpoint, counters: current ? addCounters({ left: current.counters, right: counters }) : counters });
  }
}
