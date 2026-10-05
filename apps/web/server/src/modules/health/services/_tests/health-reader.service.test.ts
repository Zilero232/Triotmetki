import type { HealthCheckResult } from '@nestjs/terminus';

import { ServiceUnavailableException } from '@nestjs/common';
import { HealthCheckService, PrismaHealthIndicator } from '@nestjs/terminus';
import { COLLECTOR_JOBS } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaService } from '../../../../core';

import { HEALTH } from '../../config/health.constants';
import { CollectorStateIndicator } from '../../indicators/collector-state.indicator';
import { RedisIndicator } from '../../indicators/redis.indicator';
import { CollectorStatusReaderService } from '../collector-status-reader.service';
import { HealthReaderService } from '../health-reader.service';

const healthy: HealthCheckResult = {
  status: 'ok',
  info: { [HEALTH.key.database]: { status: 'up' } },
  error: {},
  details: { [HEALTH.key.database]: { status: 'up' } }
};

const failing: HealthCheckResult = {
  status: 'error',
  info: {},
  error: { [HEALTH.key.redis]: { status: 'down', message: 'ECONNREFUSED' } },
  details: { [HEALTH.key.redis]: { status: 'down', message: 'ECONNREFUSED' } }
};

const createHealth = () => {
  const health = mock<HealthCheckService>();
  const prismaIndicator = mock<PrismaHealthIndicator>();
  const redis = mock<RedisIndicator>();
  const collector = mock<CollectorStateIndicator>();

  const collectorStatus = mock<CollectorStatusReaderService>();
  const prisma = mockDeep<PrismaService>();

  collectorStatus.status.mockResolvedValue({
    jobs: COLLECTOR_JOBS.map((job) => ({ job, lastSuccessAt: null, version: null })),
    queues: [],
    queuesCollectedAt: null,
    lastModBattleAt: null
  });

  return {
    health,
    prismaIndicator,
    prisma,
    redis,
    collector,
    collectorStatus,
    service: new HealthReaderService(health, prismaIndicator, prisma, redis, collector, collectorStatus)
  };
};

describe('HealthReaderService.check', () => {
  it('checks the database, Redis, the worker heartbeat and the Lesta circuit', async () => {
    const { health, prismaIndicator, prisma, redis, collector, service } = createHealth();

    health.check.mockImplementation(async (indicators) => {
      await Promise.all(indicators.map((indicator) => (typeof indicator === 'function' ? indicator() : indicator)));

      return healthy;
    });

    expect(await service.check()).toMatchObject({ status: 'ok' });
    expect(prismaIndicator.pingCheck).toHaveBeenCalledWith(HEALTH.key.database, prisma);
    expect(redis.ping).toHaveBeenCalledOnce();
    expect(collector.worker).toHaveBeenCalledOnce();
    expect(collector.lestaCircuit).toHaveBeenCalledOnce();
  });

  it('returns the failed report instead of throwing when a dependency is down', async () => {
    const { health, service } = createHealth();

    health.check.mockRejectedValue(new ServiceUnavailableException(failing));

    expect(await service.check()).toMatchObject({ status: 'error', details: { [HEALTH.key.redis]: { status: 'down' } } });
  });

  it('adds the collector status and the API build to the report', async () => {
    const { health, service } = createHealth();

    health.check.mockResolvedValue(healthy);

    const report = await service.check();

    expect(report.collector.jobs.map(({ job }) => job)).toEqual([...COLLECTOR_JOBS]);
    expect(report.build.version.length).toBeGreaterThan(0);
  });

  it('rethrows an unexpected failure of the health check itself', async () => {
    const { health, service } = createHealth();

    health.check.mockRejectedValue(new Error('boom'));

    await expect(service.check()).rejects.toThrow('boom');
  });
});
