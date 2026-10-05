import { Injectable } from '@nestjs/common';
import { addMinutes } from 'date-fns';
import pRetry from 'p-retry';

import type { Challenge } from '../../../../../generated';
import type {
  ActivateByStreamerInput,
  ActivateChallengeInput,
  CreateStreamerChallengeInput,
  DonationInput,
  OwnedInput,
  StreamerChallengeView
} from '../challenges.types';

import { AppBadRequestException, AppConflictException, AppNotFoundException } from '../../../../common/exceptions';
import { randomCode, readRecord } from '../../../../common/lib';
import { isUniqueViolation, PrismaService } from '../../../../core';
import { CHALLENGE } from '../config/challenge.constants';
import { matchDonation } from '../lib/donation-match/donation-match';
import { toChallengeView } from '../mappers/challenge.mappers';

@Injectable()
export class ChallengeWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string): Promise<StreamerChallengeView[]> {
    const challenges = await this.prisma.challenge.findMany({
      where: { streamerUserId: userId },
      orderBy: { createdAt: 'desc' },
      take: CHALLENGE.listLimit
    });

    return challenges.map(toChallengeView);
  }

  async create({ userId, title, condition, amount, expiresInMinutes }: CreateStreamerChallengeInput): Promise<StreamerChallengeView> {
    const [profile, open] = await Promise.all([
      this.prisma.streamerProfile.findUnique({ where: { userId }, select: { accountId: true } }),
      this.prisma.challenge.count({ where: { streamerUserId: userId, status: { in: ['pending', 'active'] } } })
    ]);

    if (!profile?.accountId) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'Link a Lesta account to the streamer profile first');
    }

    if (open >= CHALLENGE.maxOpen) {
      throw new AppConflictException('PLAN_LIMIT_REACHED', 'Too many open challenges');
    }

    const accountId = profile.accountId;

    try {
      const challenge = await pRetry(
        () =>
          this.prisma.challenge.create({
            data: {
              streamerUserId: userId,
              accountId,
              code: randomCode({ alphabet: CHALLENGE.codeAlphabet, length: CHALLENGE.codeLength }),
              title,
              condition,
              amount,
              currency: CHALLENGE.defaultCurrency,
              progress: { battles: 0, value: 0, battleIds: [], durationMinutes: expiresInMinutes }
            }
          }),
        { retries: CHALLENGE.codeAttempts - 1, minTimeout: 0, shouldRetry: ({ error }) => isUniqueViolation(error) }
      );

      return toChallengeView(challenge);
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new AppConflictException('CONFLICT', 'Could not allocate a challenge code');
      }

      throw error;
    }
  }

  async cancel({ userId, id }: OwnedInput): Promise<StreamerChallengeView> {
    await this.owned({ userId, id });

    const updated = await this.prisma.challenge.updateMany({
      where: { id, status: { in: ['pending', 'active'] } },
      data: { status: 'cancelled', resolvedAt: new Date() }
    });

    if (updated.count === 0) {
      throw new AppConflictException('CONFLICT', 'The challenge is already resolved');
    }

    return toChallengeView(await this.prisma.challenge.findUniqueOrThrow({ where: { id } }));
  }

  async activateByStreamer({ userId, id, donorName }: ActivateByStreamerInput): Promise<StreamerChallengeView> {
    await this.owned({ userId, id });

    const activated = await this.activate({ challengeId: id, donorName, donorMessage: null, source: null, externalId: null, now: new Date() });

    if (!activated) {
      throw new AppConflictException('CONFLICT', 'Only a pending challenge can be activated');
    }

    return toChallengeView(activated);
  }

  async activate({ challengeId, donorName, donorMessage, source, externalId, now }: ActivateChallengeInput): Promise<Challenge | null> {
    const challenge = await this.prisma.challenge.findUnique({ where: { id: challengeId } });

    if (challenge?.status !== 'pending') {
      return null;
    }

    const progress = readRecord(challenge.progress);
    const minutes = typeof progress.durationMinutes === 'number' ? progress.durationMinutes : null;

    try {
      const updated = await this.prisma.challenge.updateMany({
        where: { id: challengeId, status: 'pending' },
        data: {
          status: 'active',
          donorName,
          donorMessage,
          donationSource: source,
          donationExternalId: externalId,
          acceptedAt: now,
          expiresAt: minutes === null ? null : addMinutes(now, minutes)
        }
      });

      return updated.count === 0 ? null : this.prisma.challenge.findUnique({ where: { id: challengeId } });
    } catch (error) {
      if (isUniqueViolation(error)) {
        return null;
      }

      throw error;
    }
  }

  async handleDonation({ streamerUserId, externalId, donorName, message, amount, currency }: DonationInput): Promise<Challenge | null> {
    const pending = await this.prisma.challenge.findMany({
      where: { streamerUserId, status: 'pending' },
      select: { id: true, code: true, amount: true, currency: true }
    });

    const matched = matchDonation({
      message,
      amount,
      currency,
      challenges: pending.map((challenge) => ({ ...challenge, amount: challenge.amount.toNumber() }))
    });

    if (!matched) {
      return null;
    }

    return this.activate({
      challengeId: matched.id,
      donorName,
      donorMessage: message,
      source: 'donationAlerts',
      externalId,
      now: new Date()
    });
  }

  private async owned({ userId, id }: OwnedInput): Promise<Challenge> {
    const challenge = await this.prisma.challenge.findUnique({ where: { id } });

    if (challenge?.streamerUserId !== userId) {
      throw new AppNotFoundException('NOT_FOUND', `No challenge ${id}`);
    }

    return challenge;
  }
}
