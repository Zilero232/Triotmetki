import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { addMinutes } from 'date-fns';
import { Redis } from 'ioredis';
import { isObjectType, isString } from 'remeda';

import type { BindResponse } from '../lib';
import type { BindCode, BindCodeInput, BindInput, BindLinkInput } from '../mod.types';

import { AppForbiddenException, ModException } from '../../../common/exceptions';
import { randomCode } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { PrismaService, REDIS, USER_LESTA_ACCOUNT_ORDER } from '../../../core';
import { BIND_CODE } from '../config';
import { bindCodePattern, bindRequestSchema, deviceSecret, hashSecret, newDeviceId, normalizeBindCode } from '../lib';

@Injectable()
export class ModBindService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async issueCode({ userId, accountId }: BindCodeInput): Promise<BindCode> {
    const links = await this.prisma.userLestaAccount.findMany({ where: { userId }, orderBy: USER_LESTA_ACCOUNT_ORDER });

    if (links.length === 0) {
      throw new AppForbiddenException('FORBIDDEN', 'Link a Lesta account before binding the mod');
    }

    const link = accountId === undefined ? null : links.find((candidate) => candidate.accountId === BigInt(accountId));

    if (accountId !== undefined && !link) {
      throw new AppForbiddenException('FORBIDDEN', 'This Lesta account is not linked to you');
    }

    const code = randomCode(BIND_CODE);
    const expiresAt = addMinutes(new Date(), BIND_CODE.ttlMinutes);

    await this.prisma.$transaction([
      this.prisma.oneTimeCode.deleteMany({ where: { userId, purpose: 'modBind', usedAt: null } }),
      this.prisma.oneTimeCode.create({ data: { code, purpose: 'modBind', userId, accountId: link?.accountId ?? null, expiresAt } })
    ]);

    return { code, accountId: link ? Number(link.accountId) : null, expiresAt: expiresAt.toISOString() };
  }

  async bind({ body, requester }: BindInput): Promise<BindResponse> {
    const rawCode = isObjectType(body) && 'code' in body && isString(body.code) ? normalizeBindCode(body.code) : null;

    if (rawCode === null || !bindCodePattern.test(rawCode)) {
      throw new ModException({ status: HttpStatus.BAD_REQUEST, error: 'invalid_code' });
    }

    const parsed = bindRequestSchema.safeParse({ ...(isObjectType(body) ? body : {}), code: rawCode });

    if (!parsed.success) {
      throw new ModException({ status: HttpStatus.BAD_REQUEST, error: 'invalid_code', message: 'Malformed bind request' });
    }

    const request = parsed.data;
    const failureKey = `${BIND_CODE.failurePrefix}${requester}`;
    const failures = Number((await this.redis.get(failureKey)) ?? 0);

    if (failures >= BIND_CODE.maxFailuresPerRequester) {
      throw new ModException({ status: HttpStatus.TOO_MANY_REQUESTS, error: 'rate_limited' });
    }

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

    await this.redis.del(failureKey);

    const deviceId = newDeviceId();
    const secret = deviceSecret({ deviceId, serverSecret: this.config.get('MOD_INGEST_SECRET') });

    await this.prisma.$transaction([
      this.prisma.modDevice.create({
        data: {
          id: deviceId,
          userId: stored.userId,
          accountId: link.accountId,
          secretHash: hashSecret(secret),
          modVersion: request.mod_version,
          gameVersion: request.client_version
        }
      }),
      this.prisma.oneTimeCode.update({ where: { code: request.code }, data: { deviceId } })
    ]);

    return { device_id: deviceId, secret, account_id: Number(link.accountId), nickname: link.player.nickname };
  }

  private bindLink({ userId, accountId }: BindLinkInput) {
    return this.prisma.userLestaAccount.findFirst({
      where: accountId === null ? { userId } : { userId, accountId },
      orderBy: USER_LESTA_ACCOUNT_ORDER,
      include: { player: true }
    });
  }

  private async refuse(failureKey: string): Promise<never> {
    await this.redis.multi().incr(failureKey).expire(failureKey, BIND_CODE.failureWindowSeconds).exec();

    throw new ModException({ status: HttpStatus.BAD_REQUEST, error: 'invalid_code' });
  }
}
