import type { ApiKey, CreatedApiKey, DeveloperOverview } from '@otmetki/schemas';

import { defaultKeyHasher } from '@better-auth/api-key';
import { Injectable, Logger } from '@nestjs/common';
import { API_KEY } from '@otmetki/schemas';
import { AuthService } from '@thallesp/nestjs-better-auth';
import { differenceInSeconds } from 'date-fns';

import type { OtmetkiAuth } from '../../../lib/auth';
import type { ApplyTierInput, AuthenticatedApiKey, CreateKeyInput, OwnedKeyInput, RejectKeyInput } from '../developer.types';

import {
  AppBadRequestException,
  AppConflictException,
  AppNotFoundException,
  AppTooManyRequestsException,
  AppUnauthorizedException
} from '../../../common/exceptions';
import { errorMessage } from '../../../common/lib';
import { LIMIT_LOCK_SCOPE, lockedTransaction, PrismaService } from '../../../core';
import { API_TIERS } from '../config/api-keys.constants';
import { keyTierOf, quotaRetryAfterSec, tierMetadata, verifyFailureOf } from '../lib/api-key/api-key';
import { toApiKey } from '../mappers/api-keys.mappers';
import { ApiTierReaderService } from './api-tier-reader.service';
import { ApiTierSyncService } from './api-tier-sync.service';

@Injectable()
export class ApiKeysWriterService {
  private readonly logger = new Logger(ApiKeysWriterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly tiers: ApiTierReaderService,
    private readonly tierSync: ApiTierSyncService,
    private readonly auth: AuthService<OtmetkiAuth>
  ) {}

  async overview(userId: string): Promise<DeveloperOverview> {
    const tier = await this.tierSync.sync(userId);
    const [keys, webhooks] = await Promise.all([this.list(userId), this.prisma.webhookEndpoint.count({ where: { userId } })]);

    return { tier, limits: API_TIERS[tier], keys, webhooks };
  }

  async list(userId: string): Promise<ApiKey[]> {
    const rows = await this.prisma.apiKey.findMany({ where: { referenceId: userId }, orderBy: { createdAt: 'desc' } });

    return rows.map(toApiKey);
  }

  async create({ userId, name, expiresAt }: CreateKeyInput): Promise<CreatedApiKey> {
    const expiresIn = expiresAt ? differenceInSeconds(new Date(expiresAt), new Date()) : null;

    if (expiresIn !== null && expiresIn < 1) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'expiresAt must be in the future');
    }

    const tier = await this.tiers.tierFor(userId);

    return lockedTransaction({
      prisma: this.prisma,
      scope: LIMIT_LOCK_SCOPE.apiKeys,
      key: userId,
      run: async (tx) => {
        const active = await tx.apiKey.count({ where: { referenceId: userId, enabled: true } });

        if (active >= API_KEY.maxActivePerUser) {
          throw new AppConflictException('CONFLICT', `At most ${API_KEY.maxActivePerUser} active API keys`);
        }

        const created = await this.auth.api.createApiKey({ body: { userId, name, expiresIn, metadata: tierMetadata(tier) } });

        return { key: toApiKey(created), secret: created.key };
      }
    });
  }

  async revoke({ userId, id }: OwnedKeyInput): Promise<void> {
    const row = await this.owned({ userId, id });

    if (row.enabled) {
      await this.auth.api.updateApiKey({ body: { keyId: id, userId, enabled: false } });
    }
  }

  async owned({ userId, id }: OwnedKeyInput) {
    const row = await this.prisma.apiKey.findFirst({ where: { id, referenceId: userId } });

    if (!row) {
      throw new AppNotFoundException('NOT_FOUND', 'API key not found');
    }

    return row;
  }

  async verify(raw: string): Promise<AuthenticatedApiKey> {
    const { valid, error, key } = await this.auth.api.verifyApiKey({ body: { key: raw.trim() } });

    if (!valid || !key) {
      return this.reject({ raw, code: typeof error?.code === 'string' ? error.code : undefined });
    }

    const tier = await this.tiers.cachedTierFor(key.referenceId);
    const dailyLimit = API_TIERS[tier].requestsPerDay;

    if (keyTierOf(key.metadata) !== tier) {
      void this.reconcile({ userId: key.referenceId, tier });
    }

    return { id: key.id, userId: key.referenceId, tier, dailyLimit, dailyRemaining: Math.min(key.remaining ?? dailyLimit, dailyLimit) };
  }

  private async reconcile({ userId, tier }: ApplyTierInput): Promise<void> {
    try {
      await this.tierSync.apply({ userId, tier });
    } catch (error) {
      this.logger.warn(`API key tier for ${userId} not reconciled: ${errorMessage(error)}`);
    }
  }

  private async reject({ raw, code }: RejectKeyInput): Promise<never> {
    const failure = verifyFailureOf(code);

    if (failure === 'revoked') {
      throw new AppUnauthorizedException('API_KEY_REVOKED', 'The API key was revoked or has expired');
    }

    if (failure === 'invalid') {
      throw new AppUnauthorizedException('API_KEY_INVALID', 'The API key is not valid');
    }

    const row = await this.prisma.apiKey.findUnique({
      where: { key: await defaultKeyHasher(raw.trim()) },
      select: { lastRefillAt: true, createdAt: true, refillInterval: true }
    });

    throw new AppTooManyRequestsException(
      'PLAN_LIMIT_REACHED',
      'The daily request quota of this key is used up',
      row ? quotaRetryAfterSec({ ...row, now: new Date() }) : null
    );
  }
}
