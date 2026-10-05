import { HttpStatus } from '@nestjs/common';
import { addMinutes } from 'date-fns';
import RedisMock from 'ioredis-mock';
import { omit } from 'remeda';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ModDevice, OneTimeCode, Player, UserLestaAccount } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';

import { AppForbiddenException } from '../../../../common/exceptions';
import { USER_LESTA_ACCOUNT_ORDER } from '../../../../core';
import { BIND_CODE, MOD_DEVICE, MOD_DEVICE_LIMITS } from '../../config';
import { bindCodePattern, deviceSecret, hashSecret } from '../../lib';
import { ModBindService } from '../mod-bind.service';

const NOW = new Date('2026-05-01T12:00:00.000Z');
const SERVER_SECRET = 'server-secret-for-tests';
const CODE = BIND_CODE.alphabet.slice(0, BIND_CODE.length);
const ACCOUNT_ID = 12345;
const REQUESTER = '203.0.113.7';

const link = (accountId: number, overrides: Partial<UserLestaAccount> = {}) =>
  mock<UserLestaAccount>({ userId: 'user', accountId: BigInt(accountId), isPrimary: false, ...overrides });

const linkWithPlayer = (accountId: number) =>
  mock<UserLestaAccount & { player: Player }>({ userId: 'user', accountId: BigInt(accountId), player: mock<Player>({ nickname: 'Tanker' }) });

const storedCode = (overrides: Partial<OneTimeCode> = {}): OneTimeCode => ({
  code: CODE,
  purpose: 'modBind',
  userId: 'user',
  accountId: null,
  deviceId: null,
  expiresAt: addMinutes(NOW, BIND_CODE.ttlMinutes),
  usedAt: null,
  createdAt: NOW,
  ...overrides
});

const bindBody = (overrides: Record<string, unknown> = {}) => ({
  code: CODE,
  account_id: ACCOUNT_ID,
  mod_version: '1.0.0',
  client_version: '1.30.0',
  realm: 'RU',
  ...overrides
});

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();

  config.get.mockReturnValue(SERVER_SECRET);
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));

  return { service: new ModBindService(prisma, config, new RedisMock()), prisma };
};

const readyToBind = (code: OneTimeCode = storedCode()) => {
  const created = createService();

  created.prisma.oneTimeCode.findUnique.mockResolvedValue(code);
  created.prisma.userLestaAccount.findFirst.mockResolvedValue(linkWithPlayer(ACCOUNT_ID));
  created.prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 1 });
  created.prisma.modDevice.findMany.mockResolvedValue([]);

  return created;
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(NOW);
});

afterEach(() => {
  vi.useRealTimers();
});

describe('ModBindService.issueCode', () => {
  it('refuses a user with no linked Lesta account', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([]);

    await expect(service.issueCode({ userId: 'user' })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.oneTimeCode.create).not.toHaveBeenCalled();
  });

  it('refuses to bind a code to an account the user has not linked', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(ACCOUNT_ID)]);

    await expect(service.issueCode({ userId: 'user', accountId: ACCOUNT_ID + 1 })).rejects.toBeInstanceOf(AppForbiddenException);
    expect(prisma.oneTimeCode.create).not.toHaveBeenCalled();
  });

  it('issues a code the mod can type back, expiring after the configured ttl', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(ACCOUNT_ID)]);

    const issued = await service.issueCode({ userId: 'user' });

    expect(issued.code).toMatch(bindCodePattern);
    expect(issued.expiresAt).toBe(addMinutes(NOW, BIND_CODE.ttlMinutes).toISOString());
    expect(issued.accountId).toBeNull();
  });

  it('replaces the unused codes of the user when issuing a new one', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(ACCOUNT_ID)]);

    await service.issueCode({ userId: 'user' });

    expect(prisma.oneTimeCode.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user', purpose: 'modBind', usedAt: null } })
    );
  });

  it('pins the code to the requested linked account', async () => {
    const { service, prisma } = createService();

    prisma.userLestaAccount.findMany.mockResolvedValue([link(ACCOUNT_ID + 1), link(ACCOUNT_ID)]);

    const issued = await service.issueCode({ userId: 'user', accountId: ACCOUNT_ID });

    expect(issued.accountId).toBe(ACCOUNT_ID);

    expect(prisma.oneTimeCode.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ accountId: BigInt(ACCOUNT_ID) }) })
    );
  });
});

describe('ModBindService.bind', () => {
  it('rejects a body without a well-formed code before touching the database', async () => {
    const { service, prisma } = createService();

    await expect(service.bind({ body: bindBody({ code: 'I0'.repeat(BIND_CODE.length / 2) }), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });

    await expect(service.bind({ body: CODE, requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });

    expect(prisma.oneTimeCode.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a valid code sent with a malformed rest of the request', async () => {
    const { service, prisma } = createService();

    await expect(service.bind({ body: bindBody({ realm: 'EU' }), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });

    expect(prisma.oneTimeCode.findUnique).not.toHaveBeenCalled();
  });

  it('accepts a code typed in lower case with separators', async () => {
    const { service, prisma } = readyToBind();

    await service.bind({ body: bindBody({ code: `${CODE.slice(0, 5).toLowerCase()}-${CODE.slice(5).toLowerCase()}` }), requester: REQUESTER });

    expect(prisma.oneTimeCode.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { code: CODE, purpose: 'modBind' } }));
  });

  it('answers an unknown code with the same error as any other refusal', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.findUnique.mockResolvedValue(null);

    await expect(service.bind({ body: bindBody(), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });
  });

  it('refuses to reuse a code that already bound a device', async () => {
    const { service, prisma } = readyToBind(storedCode({ usedAt: NOW }));

    await expect(service.bind({ body: bindBody(), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });

    expect(prisma.modDevice.create).not.toHaveBeenCalled();
  });

  it('treats a code as expired at the exact expiry instant', async () => {
    const { service, prisma } = readyToBind(storedCode({ expiresAt: NOW }));

    await expect(service.bind({ body: bindBody(), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });

    expect(prisma.modDevice.create).not.toHaveBeenCalled();
  });

  it('still accepts a code one millisecond before it expires', async () => {
    const { service } = readyToBind(storedCode({ expiresAt: new Date(NOW.getTime() + 1) }));

    await expect(service.bind({ body: bindBody(), requester: REQUESTER })).resolves.toMatchObject({ account_id: ACCOUNT_ID });
  });

  it('refuses an account the code owner has not linked', async () => {
    const { service, prisma } = readyToBind();

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.bind({ body: bindBody(), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });

    expect(prisma.oneTimeCode.updateMany).not.toHaveBeenCalled();
  });

  it('refuses a linked account other than the one the code was pinned to', async () => {
    const { service, prisma } = readyToBind(storedCode({ accountId: BigInt(ACCOUNT_ID + 1) }));

    await expect(service.bind({ body: bindBody(), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });

    expect(prisma.oneTimeCode.updateMany).not.toHaveBeenCalled();
  });

  it('loses gracefully when a concurrent bind claims the code first', async () => {
    const { service, prisma } = readyToBind();

    prisma.oneTimeCode.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.bind({ body: bindBody(), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });

    expect(prisma.modDevice.create).not.toHaveBeenCalled();
  });

  it('claims only an unused, unexpired bind code', async () => {
    const { service, prisma } = readyToBind();

    await service.bind({ body: bindBody(), requester: REQUESTER });

    expect(prisma.oneTimeCode.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { code: CODE, purpose: 'modBind', usedAt: null, expiresAt: { gt: NOW } },
        data: { usedAt: NOW }
      })
    );
  });

  it('hands the mod a device secret derived from the server secret and stores only its hash', async () => {
    const { service, prisma } = readyToBind();

    const response = await service.bind({ body: bindBody(), requester: REQUESTER });

    expect(response.device_id.startsWith(MOD_DEVICE.idPrefix)).toBe(true);
    expect(response.secret).toBe(deviceSecret({ deviceId: response.device_id, serverSecret: SERVER_SECRET }));
    expect(response.nickname).toBe('Tanker');

    expect(prisma.modDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          id: response.device_id,
          userId: 'user',
          accountId: BigInt(ACCOUNT_ID),
          secretHash: hashSecret(response.secret)
        })
      })
    );
  });

  it('revokes the oldest active devices so the new one stays within the per-user cap', async () => {
    const { service, prisma } = readyToBind();
    const active = Array.from({ length: MOD_DEVICE_LIMITS.maxPerUser }, (_, index) => mock<ModDevice>({ id: `dev_${index}` }));

    prisma.modDevice.findMany.mockResolvedValue(active);

    const response = await service.bind({ body: bindBody(), requester: REQUESTER });
    const oldest = active.slice(MOD_DEVICE_LIMITS.maxPerUser - 1).map((device) => device.id);

    expect(prisma.modDevice.updateMany).toHaveBeenCalledWith({
      where: { id: { in: oldest }, userId: 'user', revokedAt: null },
      data: { revokedAt: NOW }
    });

    expect(response.revoked_device_ids).toEqual(oldest);
  });

  it('revokes nothing while the user is under the device cap', async () => {
    const { service, prisma } = readyToBind();

    prisma.modDevice.findMany.mockResolvedValue([mock<ModDevice>({ id: 'dev_0' })]);

    const response = await service.bind({ body: bindBody(), requester: REQUESTER });

    expect(prisma.modDevice.updateMany).not.toHaveBeenCalled();
    expect(response.revoked_device_ids).toBeUndefined();
  });

  it('records which device consumed the code', async () => {
    const { service, prisma } = readyToBind();

    const response = await service.bind({ body: bindBody(), requester: REQUESTER });

    expect(prisma.oneTimeCode.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { code: CODE }, data: { deviceId: response.device_id } })
    );
  });

  it('stops a requester trying codes for an account after too many failures', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.findUnique.mockResolvedValue(null);

    for (let attempt = 0; attempt < BIND_CODE.maxFailuresPerRequester; attempt += 1) {
      await expect(service.bind({ body: bindBody(), requester: REQUESTER })).rejects.toMatchObject({
        status: HttpStatus.BAD_REQUEST,
        response: { error: 'invalid_code' }
      });
    }

    await expect(service.bind({ body: bindBody(), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: { error: 'rate_limited' }
    });

    expect(prisma.oneTimeCode.findUnique).toHaveBeenCalledTimes(BIND_CODE.maxFailuresPerRequester);
  });

  it('counts failures per requester, so naming a different account each time does not reset the budget', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.findUnique.mockResolvedValue(null);

    for (let attempt = 0; attempt < BIND_CODE.maxFailuresPerRequester; attempt += 1) {
      await service.bind({ body: bindBody({ account_id: ACCOUNT_ID + attempt }), requester: REQUESTER }).catch(() => undefined);
    }

    await expect(service.bind({ body: bindBody({ account_id: ACCOUNT_ID - 1 }), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: { error: 'rate_limited' }
    });
  });

  it('binds the account the code was pinned to when the request names none', async () => {
    const { service, prisma } = readyToBind(storedCode({ accountId: BigInt(ACCOUNT_ID) }));
    const body = omit(bindBody(), ['account_id']);

    const response = await service.bind({ body, requester: REQUESTER });

    expect(response.account_id).toBe(ACCOUNT_ID);
    expect(prisma.userLestaAccount.findFirst.mock.calls[0]?.[0]?.where).toEqual({ userId: 'user', accountId: BigInt(ACCOUNT_ID) });

    expect(prisma.modDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ accountId: BigInt(ACCOUNT_ID) }) })
    );
  });

  it('binds the primary linked account of the code owner when neither the request nor the code names one', async () => {
    const { service, prisma } = readyToBind();
    const body = omit(bindBody(), ['account_id']);

    const response = await service.bind({ body, requester: REQUESTER });

    expect(response.account_id).toBe(ACCOUNT_ID);

    expect(prisma.userLestaAccount.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: 'user' }, orderBy: USER_LESTA_ACCOUNT_ORDER })
    );
  });

  it('refuses a code without an account when its owner has no linked account left', async () => {
    const { service, prisma } = readyToBind();
    const body = omit(bindBody(), ['account_id']);

    prisma.userLestaAccount.findFirst.mockResolvedValue(null);

    await expect(service.bind({ body, requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });

    expect(prisma.modDevice.create).not.toHaveBeenCalled();
  });

  it('still stops a requester guessing codes without naming an account', async () => {
    const { service, prisma } = createService();
    const body = omit(bindBody(), ['account_id']);

    prisma.oneTimeCode.findUnique.mockResolvedValue(null);

    for (let attempt = 0; attempt < BIND_CODE.maxFailuresPerRequester; attempt += 1) {
      await service.bind({ body, requester: REQUESTER }).catch(() => undefined);
    }

    await expect(service.bind({ body, requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
      response: { error: 'rate_limited' }
    });
  });

  it('does not let a stranger lock the real owner out of binding their account', async () => {
    const { service, prisma } = createService();

    prisma.oneTimeCode.findUnique.mockResolvedValue(null);

    for (let attempt = 0; attempt < BIND_CODE.maxFailuresPerRequester; attempt += 1) {
      await service.bind({ body: bindBody(), requester: '198.51.100.9' }).catch(() => undefined);
    }

    await expect(service.bind({ body: bindBody(), requester: REQUESTER })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_code' }
    });
  });
});
