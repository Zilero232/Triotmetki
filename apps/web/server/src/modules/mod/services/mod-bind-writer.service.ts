import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { addMinutes } from 'date-fns';
import { Redis } from 'ioredis';
import { isObjectType, isString } from 'remeda';

import type { BindResponse } from '../lib/contract/contract.types';
import type { BindCode, BindCodeInput, BindInput, BindLinkInput, BindRequest, ClaimCodeInput, ClaimedCode, RegisterDeviceInput } from '../mod.types';

import { AppForbiddenException, ModException } from '../../../common/exceptions';
import { randomCode } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { LIMIT_LOCK_SCOPE, lockedTransaction, PrismaService, REDIS } from '../../../core';
import { UserAccountsReaderService } from '../../accounts';
import { BIND_CODE } from '../config/bind-code.constants';
import { MOD_DEVICE_LIMITS } from '../config/device.constants';
import { bindCodePattern, bindRequestSchema } from '../lib/contract/contract.schemas';
import { deviceSecret, hashSecret, newDeviceId, normalizeBindCode } from '../lib/device-secret/device-secret';

@Injectable()
export class ModBindWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis,
    private readonly accounts: UserAccountsReaderService
  ) {}

  async issueCode({ userId, accountId }: BindCodeInput): Promise<BindCode> {
    const linkedIds = await this.accounts.accountIds(userId);

    if (linkedIds.length === 0) {
      throw new AppForbiddenException('FORBIDDEN', 'Link a Lesta account before binding the mod');
    }

    const linked = accountId === undefined ? null : (linkedIds.find((candidate) => candidate === BigInt(accountId)) ?? null);

    if (accountId !== undefined && linked === null) {
      throw new AppForbiddenException('FORBIDDEN', 'This Lesta account is not linked to you');
    }

    const code = randomCode(BIND_CODE);
    const expiresAt = addMinutes(new Date(), BIND_CODE.ttlMinutes);

    await this.prisma.$transaction([
      this.prisma.oneTimeCode.deleteMany({ where: { userId, purpose: 'modBind', usedAt: null } }),
      this.prisma.oneTimeCode.create({ data: { code, purpose: 'modBind', userId, accountId: linked, expiresAt } })
    ]);

    return { code, accountId: linked === null ? null : Number(linked), expiresAt: expiresAt.toISOString() };
  }

  async bind({ body, requester }: BindInput): Promise<BindResponse> {
    const request = this.parseRequest(body);
    const failureKey = `${BIND_CODE.failurePrefix}${requester}`;

    await this.assertUnderFailureLimit(failureKey);

    const { userId, link } = await this.claimCode({ request, failureKey });

    await this.redis.del(failureKey);

    const deviceId = newDeviceId();
    const secret = deviceSecret({ deviceId, serverSecret: this.config.get('MOD_INGEST_SECRET') });
    const revoked = await this.registerDevice({ request, userId, accountId: link.accountId, deviceId, secret });

    return {
      device_id: deviceId,
      secret,
      account_id: Number(link.accountId),
      nickname: link.player.nickname,
      ...(revoked.length > 0 ? { revoked_device_ids: revoked } : {})
    };
  }

  private parseRequest(body: unknown): BindRequest {
    const rawCode = isObjectType(body) && 'code' in body && isString(body.code) ? normalizeBindCode(body.code) : null;

    if (rawCode === null || !bindCodePattern.test(rawCode)) {
      throw new ModException({ status: HttpStatus.BAD_REQUEST, error: 'invalid_code' });
    }

    const parsed = bindRequestSchema.safeParse({ ...(isObjectType(body) ? body : {}), code: rawCode });

    if (!parsed.success) {
      throw new ModException({ status: HttpStatus.BAD_REQUEST, error: 'invalid_code', message: 'Malformed bind request' });
    }

    return parsed.data;
  }

  private async assertUnderFailureLimit(failureKey: string): Promise<void> {
    const failures = Number((await this.redis.get(failureKey)) ?? 0);

    if (failures >= BIND_CODE.maxFailuresPerRequester) {
      throw new ModException({ status: HttpStatus.TOO_MANY_REQUESTS, error: 'rate_limited' });
    }
  }

  private async claimCode({ request, failureKey }: ClaimCodeInput): Promise<ClaimedCode> {
    const stored = await this.prisma.oneTimeCode.findUnique({ where: { code: request.code, purpose: 'modBind' } });
    const requested = request.account_id === undefined ? null : BigInt(request.account_id);
    const link = stored ? await this.bindLink({ userId: stored.userId, accountId: requested ?? stored.accountId }) : null;

    const usable =
      stored !== null &&
      stored.usedAt === null &&
      stored.expiresAt > new Date() &&
      (stored.accountId === null || stored.accountId === link?.accountId);

    if (!stored || !usable || !link) {
      return this.refuse(failureKey);
    }

    const claimed = await this.prisma.oneTimeCode.updateMany({
      where: { code: request.code, purpose: 'modBind', usedAt: null, expiresAt: { gt: new Date() } },
      data: { usedAt: new Date() }
    });

    if (claimed.count === 0) {
      return this.refuse(failureKey);
    }

    return { userId: stored.userId, link };
  }

  private registerDevice({ request, userId, accountId, deviceId, secret }: RegisterDeviceInput): Promise<string[]> {
    return lockedTransaction({
      prisma: this.prisma,
      scope: LIMIT_LOCK_SCOPE.modDevices,
      key: userId,
      run: async (tx) => {
        const active = await tx.modDevice.findMany({ where: { userId, revokedAt: null }, orderBy: { createdAt: 'desc' }, select: { id: true } });
        const overflow = active.slice(MOD_DEVICE_LIMITS.maxPerUser - 1).map((device) => device.id);

        if (overflow.length > 0) {
          await tx.modDevice.updateMany({ where: { id: { in: overflow }, userId, revokedAt: null }, data: { revokedAt: new Date() } });
        }

        await tx.modDevice.create({
          data: {
            id: deviceId,
            userId,
            accountId,
            secretHash: hashSecret(secret),
            modVersion: request.mod_version,
            gameVersion: request.client_version
          }
        });

        await tx.oneTimeCode.update({ where: { code: request.code }, data: { deviceId } });

        return overflow;
      }
    });
  }

  private async bindLink({ userId, accountId }: BindLinkInput) {
    const linked = accountId ?? (await this.accounts.primaryAccountId(userId));

    if (linked === null) {
      return null;
    }

    return this.prisma.userLestaAccount.findFirst({ where: { userId, accountId: linked }, include: { player: true } });
  }

  private async refuse(failureKey: string): Promise<never> {
    await this.redis.multi().incr(failureKey).expire(failureKey, BIND_CODE.failureWindowSeconds).exec();

    throw new ModException({ status: HttpStatus.BAD_REQUEST, error: 'invalid_code' });
  }
}
