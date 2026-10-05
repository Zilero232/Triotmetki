import { REFERRAL } from '@otmetki/schemas';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Referral, User } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { SubscriptionWriterService } from '../subscription-writer.service';

import { Prisma } from '../../../../../generated';
import { PRISMA_CODE } from '../../../../core/prisma/prisma.constants';
import { ReferralWriterService } from '../referral-writer.service';

const NOW = new Date('2026-09-26T12:00:00Z');

const uniqueViolation = () => new Prisma.PrismaClientKnownRequestError('duplicate', { code: PRISMA_CODE.uniqueViolation, clientVersion: 'test' });

describe('ReferralWriterService', () => {
  const createService = () => {
    const prisma = mockDeep<PrismaService>();
    const subscriptions = mock<SubscriptionWriterService>();

    return { service: new ReferralWriterService(prisma, subscriptions), prisma, subscriptions };
  };

  it('does not let a user refer themselves', async () => {
    const { service, prisma } = createService();

    await expect(service.register({ userId: 'u1', referrerId: 'u1' })).rejects.toMatchObject({
      status: 400,
      response: { code: 'VALIDATION_FAILED' }
    });

    expect(prisma.referral.create).not.toHaveBeenCalled();
  });

  it('refuses an unknown referrer', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(null);
    prisma.payment.count.mockResolvedValue(0);

    await expect(service.register({ userId: 'u1', referrerId: 'ghost' })).rejects.toMatchObject({ status: 404, response: { code: 'NOT_FOUND' } });
    expect(prisma.referral.create).not.toHaveBeenCalled();
  });

  it('does not accept a referral for a user who already paid', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(mock<User>({ id: 'ref' }));
    prisma.payment.count.mockResolvedValue(1);

    await expect(service.register({ userId: 'u1', referrerId: 'ref' })).rejects.toMatchObject({ status: 409, response: { code: 'CONFLICT' } });
    expect(prisma.referral.create).not.toHaveBeenCalled();
  });

  it('records the referral of a user who never paid', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(mock<User>({ id: 'ref' }));
    prisma.payment.count.mockResolvedValue(0);

    await service.register({ userId: 'u1', referrerId: 'ref' });

    expect(prisma.referral.create).toHaveBeenCalledWith(expect.objectContaining({ data: { referredUserId: 'u1', referrerUserId: 'ref' } }));
  });

  it('answers a conflict when the user is already referred', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(mock<User>({ id: 'ref' }));
    prisma.payment.count.mockResolvedValue(0);
    prisma.referral.create.mockRejectedValue(uniqueViolation());

    await expect(service.register({ userId: 'u1', referrerId: 'ref' })).rejects.toMatchObject({ status: 409, response: { code: 'CONFLICT' } });
  });

  it('rethrows a write failure that is not a duplicate', async () => {
    const { service, prisma } = createService();

    prisma.user.findUnique.mockResolvedValue(mock<User>({ id: 'ref' }));
    prisma.payment.count.mockResolvedValue(0);
    prisma.referral.create.mockRejectedValue(new Error('db down'));

    await expect(service.register({ userId: 'u1', referrerId: 'ref' })).rejects.toThrow('db down');
  });

  it('rewards the referrer once, on the first settled payment', async () => {
    const { service, prisma, subscriptions } = createService();

    prisma.referral.findUnique.mockResolvedValue(mock<Referral>({ referrerUserId: 'ref', rewardedAt: null }));
    prisma.referral.updateMany.mockResolvedValueOnce({ count: 1 }).mockResolvedValueOnce({ count: 0 });

    expect(await service.reward({ db: prisma, userId: 'u1', now: NOW })).toBe('ref');
    expect(await service.reward({ db: prisma, userId: 'u1', now: NOW })).toBeNull();
    expect(subscriptions.grantDays).toHaveBeenCalledTimes(1);
    expect(subscriptions.grantDays).toHaveBeenCalledWith({ db: prisma, userId: 'ref', days: REFERRAL.bonusDays, now: NOW });
  });

  it('does not reward a user who was never referred', async () => {
    const { service, prisma, subscriptions } = createService();

    prisma.referral.findUnique.mockResolvedValue(null);

    expect(await service.reward({ db: prisma, userId: 'u1', now: NOW })).toBeNull();
    expect(subscriptions.grantDays).not.toHaveBeenCalled();
  });

  it('does not reward a referral that was already rewarded', async () => {
    const { service, prisma, subscriptions } = createService();

    prisma.referral.findUnique.mockResolvedValue(mock<Referral>({ referrerUserId: 'ref', rewardedAt: NOW }));

    expect(await service.reward({ db: prisma, userId: 'u1', now: NOW })).toBeNull();
    expect(prisma.referral.updateMany).not.toHaveBeenCalled();
    expect(subscriptions.grantDays).not.toHaveBeenCalled();
  });
});
