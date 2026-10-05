import { addMinutes } from 'date-fns';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Challenge, StreamerProfile } from '../../../../../../generated';
import type { PrismaService } from '../../../../../core';

import { Prisma } from '../../../../../../generated';
import { CHALLENGE } from '../../config/challenge.constants';
import { ChallengeWriterService } from '../challenge-writer.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const DURATION_MINUTES = 60;

const condition = { metric: 'damage', value: 3000, operator: 'gte', battles: 1, aggregate: 'single' } as const;

const createInput = { userId: 's1', title: '3000 on LT', amount: 500, expiresInMinutes: DURATION_MINUTES, condition };

const collision = () => new Prisma.PrismaClientKnownRequestError('duplicate', { code: 'P2002', clientVersion: 'test' });

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

const pending: Challenge = {
  ...mock<Challenge>({ id: 'c1', code: 'ABCDE', status: 'pending', currency: 'RUB' }),
  amount: new Prisma.Decimal(500),
  progress: { battles: 0, value: 0, battleIds: [], durationMinutes: DURATION_MINUTES }
};

const donation = { streamerUserId: 's1', externalId: 'd-1', donorName: 'Viewer', message: 'на ЛТ #ABCDE', amount: 500, currency: 'RUB' };

const createService = () => {
  const prisma = mockDeep<PrismaService>();

  prisma.challenge.findMany.mockResolvedValue([pending]);
  prisma.challenge.findUnique.mockResolvedValue(pending);

  return { service: new ChallengeWriterService(prisma), prisma };
};

describe('ChallengeWriterService.handleDonation', () => {
  it('activates the matching challenge with the donor and a deadline', async () => {
    const { service, prisma } = createService();

    prisma.challenge.updateMany.mockResolvedValue({ count: 1 });

    await service.handleDonation(donation);

    expect(prisma.challenge.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'c1', status: 'pending' },
        data: expect.objectContaining({
          status: 'active',
          donorName: 'Viewer',
          donationSource: 'donationAlerts',
          donationExternalId: 'd-1',
          acceptedAt: NOW,
          expiresAt: addMinutes(NOW, DURATION_MINUTES)
        })
      })
    );
  });

  it('leaves challenges alone when the donation does not match', async () => {
    const { service, prisma } = createService();

    expect(await service.handleDonation({ ...donation, amount: 100 })).toBeNull();
    expect(prisma.challenge.updateMany).not.toHaveBeenCalled();
  });

  it('treats a replayed donation as already handled', async () => {
    const { service, prisma } = createService();

    prisma.challenge.updateMany.mockRejectedValue(collision());

    expect(await service.handleDonation(donation)).toBeNull();
  });
});

describe('ChallengeWriterService.activate', () => {
  const activation = { challengeId: 'c1', donorName: 'Viewer', donorMessage: null, source: null, externalId: null, now: NOW };

  it('sets no deadline for a challenge without a duration', async () => {
    const { service, prisma } = createService();

    prisma.challenge.findUnique.mockResolvedValue({ ...pending, progress: { battles: 0, value: 0, battleIds: [] } });
    prisma.challenge.updateMany.mockResolvedValue({ count: 1 });

    await service.activate(activation);

    expect(prisma.challenge.updateMany).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ expiresAt: null }) }));
  });

  it('does not activate a challenge that is no longer pending', async () => {
    const { service, prisma } = createService();

    prisma.challenge.findUnique.mockResolvedValue({ ...pending, status: 'active' });

    expect(await service.activate(activation)).toBeNull();
    expect(prisma.challenge.updateMany).not.toHaveBeenCalled();
  });

  it('returns nothing when a concurrent activation won the race', async () => {
    const { service, prisma } = createService();

    prisma.challenge.updateMany.mockResolvedValue({ count: 0 });

    expect(await service.activate(activation)).toBeNull();
  });

  it('rethrows a write failure that is not a duplicate', async () => {
    const { service, prisma } = createService();

    prisma.challenge.updateMany.mockRejectedValue(new Error('db down'));

    await expect(service.activate(activation)).rejects.toThrow('db down');
  });
});

describe('ChallengeWriterService.activateByStreamer', () => {
  it('answers a conflict for a challenge that is not pending', async () => {
    const { service, prisma } = createService();

    prisma.challenge.findUnique.mockResolvedValue({ ...pending, streamerUserId: 's1', status: 'active' });

    await expect(service.activateByStreamer({ userId: 's1', id: 'c1', donorName: 'Viewer' })).rejects.toMatchObject({
      response: { code: 'CONFLICT' }
    });
  });

  it('answers 404 for another streamer’s challenge', async () => {
    const { service, prisma } = createService();

    prisma.challenge.findUnique.mockResolvedValue({ ...pending, streamerUserId: 'other' });

    await expect(service.activateByStreamer({ userId: 's1', id: 'c1', donorName: 'Viewer' })).rejects.toMatchObject({
      response: { code: 'NOT_FOUND' }
    });
  });
});

describe('ChallengeWriterService.create', () => {
  it('needs a linked game account on the streamer profile', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(mock<StreamerProfile>({ accountId: null }));
    prisma.challenge.count.mockResolvedValue(0);

    await expect(service.create(createInput)).rejects.toMatchObject({ status: 400, response: { code: 'VALIDATION_FAILED' } });
  });

  it('refuses a challenge over the open-challenge limit', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(mock<StreamerProfile>({ accountId: 7n }));
    prisma.challenge.count.mockResolvedValue(CHALLENGE.maxOpen);

    await expect(service.create(createInput)).rejects.toMatchObject({ response: { code: 'PLAN_LIMIT_REACHED' } });
    expect(prisma.challenge.create).not.toHaveBeenCalled();
  });

  it('retries a code collision before giving up with a conflict', async () => {
    const { service, prisma } = createService();

    prisma.streamerProfile.findUnique.mockResolvedValue(mock<StreamerProfile>({ accountId: 7n }));
    prisma.challenge.count.mockResolvedValue(0);
    prisma.challenge.create.mockRejectedValue(collision());

    await expect(service.create(createInput)).rejects.toMatchObject({ response: { code: 'CONFLICT' } });
    expect(prisma.challenge.create).toHaveBeenCalledTimes(CHALLENGE.codeAttempts);
  });
});
