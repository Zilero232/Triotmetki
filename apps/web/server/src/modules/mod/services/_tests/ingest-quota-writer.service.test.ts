import { HttpStatus } from '@nestjs/common';
import RedisMock from 'ioredis-mock';
import { describe, expect, it } from 'vitest';

import { ModException } from '../../../../common/exceptions';
import { secondsUntilNextDay } from '../../../../common/lib';
import { MOD_INGEST_QUOTA } from '../../config/ingest.constants';
import { IngestQuotaWriterService } from '../ingest-quota-writer.service';

const NOW = new Date('2026-10-06T12:00:00.000Z');
const NEXT_DAY = new Date('2026-10-07T12:00:00.000Z');

let nextAccountId = 1_000n;

const freshAccount = () => {
  nextAccountId += 1n;

  return nextAccountId;
};

const createService = () => new IngestQuotaWriterService(new RedisMock());

const refusal = async (claim: Promise<void>) => {
  try {
    await claim;
  } catch (error) {
    return error;
  }

  return null;
};

describe('IngestQuotaWriterService.claimEvents', () => {
  it('lets an account send events up to the daily cap', async () => {
    const service = createService();
    const accountId = freshAccount();

    const claim = service.claimEvents({ accountId, count: MOD_INGEST_QUOTA.eventsPerDay, now: NOW });

    await expect(claim).resolves.toBeUndefined();
  });

  it('refuses a batch that would pass the daily cap with rate_limited', async () => {
    const service = createService();
    const accountId = freshAccount();

    await service.claimEvents({ accountId, count: MOD_INGEST_QUOTA.eventsPerDay, now: NOW });

    const error = await refusal(service.claimEvents({ accountId, count: 1, now: NOW }));

    expect(error).toBeInstanceOf(ModException);
  });

  it('answers 429 past the cap', async () => {
    const service = createService();
    const accountId = freshAccount();

    await service.claimEvents({ accountId, count: MOD_INGEST_QUOTA.eventsPerDay, now: NOW });

    const error = await refusal(service.claimEvents({ accountId, count: 1, now: NOW }));

    expect(error).toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS, response: { error: 'rate_limited' } });
  });

  it('asks the mod to come back at Moscow midnight', async () => {
    const service = createService();
    const accountId = freshAccount();

    await service.claimEvents({ accountId, count: MOD_INGEST_QUOTA.eventsPerDay, now: NOW });

    const error = await refusal(service.claimEvents({ accountId, count: 1, now: NOW }));

    expect(error).toMatchObject({ retryAfterSeconds: secondsUntilNextDay(NOW) });
  });

  it('does not charge a refused batch, so a smaller one still fits', async () => {
    const service = createService();
    const accountId = freshAccount();

    await service.claimEvents({ accountId, count: MOD_INGEST_QUOTA.eventsPerDay - 10, now: NOW });
    await refusal(service.claimEvents({ accountId, count: 50, now: NOW }));

    const claim = service.claimEvents({ accountId, count: 10, now: NOW });

    await expect(claim).resolves.toBeUndefined();
  });

  it('starts over on the next Moscow day', async () => {
    const service = createService();
    const accountId = freshAccount();

    await service.claimEvents({ accountId, count: MOD_INGEST_QUOTA.eventsPerDay, now: NOW });

    const claim = service.claimEvents({ accountId, count: 1, now: NEXT_DAY });

    await expect(claim).resolves.toBeUndefined();
  });
});

describe('IngestQuotaWriterService.claimBattle', () => {
  const fillBattles = async ({ service, accountId }: { service: IngestQuotaWriterService; accountId: bigint }) => {
    for (let battle = 0; battle < MOD_INGEST_QUOTA.newBattlesPerDay; battle += 1) {
      await service.claimBattle({ accountId, now: NOW });
    }
  };

  it('refuses a new battle past the daily cap', async () => {
    const service = createService();
    const accountId = freshAccount();

    await fillBattles({ service, accountId });

    const error = await refusal(service.claimBattle({ accountId, now: NOW }));

    expect(error).toMatchObject({ status: HttpStatus.TOO_MANY_REQUESTS });
  });

  it('gives a released battle slot back', async () => {
    const service = createService();
    const accountId = freshAccount();

    await fillBattles({ service, accountId });
    await service.releaseBattle({ accountId, now: NOW });

    const claim = service.claimBattle({ accountId, now: NOW });

    await expect(claim).resolves.toBeUndefined();
  });
});
