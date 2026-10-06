import type { RawBodyRequest } from '@nestjs/common';
import type { Request } from 'express';

import { HttpStatus } from '@nestjs/common';
import RedisMock from 'ioredis-mock';
import { createHmac } from 'node:crypto';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';
import { z } from 'zod';

import type { ModDevice } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { SignedHeader } from '../../lib/request-signature/request-signature.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { MOD_DEVICE, MOD_REQUEST } from '../../config/device.constants';
import { deviceSecret, hashSecret } from '../../lib/device-secret/device-secret';
import { signedMessage } from '../../lib/request-signature/request-signature';
import { ModDeviceService } from '../mod-device.service';

const SERVER_SECRET = 'server-secret-for-tests';
const DEVICE_ID = 'dev_test';
const BODY = Buffer.from('{"events":[]}');

const secret = deviceSecret({ deviceId: DEVICE_ID, serverSecret: SERVER_SECRET });

const signatureOf = ({ key, body }: { key: string; body: Buffer }) => `sha256=${createHmac('sha256', key).update(body).digest('hex')}`;

const device = (overrides: Partial<ModDevice> = {}): ModDevice => ({
  id: DEVICE_ID,
  userId: 'user',
  accountId: 12345n,
  name: null,
  secretHash: hashSecret(secret),
  modVersion: '1.0.0',
  gameVersion: '1.30.0',
  badgeVisible: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date('2026-05-01T12:00:00.000Z'),
  ...overrides
});

const createService = ({ stored = device(), serverSecret = SERVER_SECRET }: { stored?: ModDevice | null; serverSecret?: string } = {}) => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();

  config.get.mockReturnValue(serverSecret);
  prisma.modDevice.findUnique.mockResolvedValue(stored);

  return { service: new ModDeviceService(prisma, config, new RedisMock()), prisma };
};

const validSignature = signatureOf({ key: secret, body: BODY });

describe('ModDeviceService.identify', () => {
  it('rejects a request without a device header without querying the database', async () => {
    const { service, prisma } = createService();

    await expect(service.identify({ deviceId: undefined, signature: validSignature })).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: 'unknown_device' }
    });

    expect(prisma.modDevice.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a device id that was never bound', async () => {
    const { service } = createService({ stored: null });

    await expect(service.identify({ deviceId: DEVICE_ID, signature: validSignature })).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: 'unknown_device' }
    });
  });

  it('rejects a device that has lost its account', async () => {
    const { service } = createService({ stored: device({ accountId: null }) });

    await expect(service.identify({ deviceId: DEVICE_ID, signature: validSignature })).rejects.toMatchObject({
      response: { error: 'unknown_device' }
    });
  });

  it('refuses a revoked device even with valid credentials', async () => {
    const { service } = createService({ stored: device({ revokedAt: new Date() }) });

    await expect(service.identify({ deviceId: DEVICE_ID, signature: validSignature })).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
      response: { error: 'device_revoked' }
    });
  });

  it('rejects a missing or malformed signature header', async () => {
    const { service } = createService();

    await expect(service.identify({ deviceId: DEVICE_ID, signature: undefined })).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: 'bad_signature' }
    });

    await expect(service.identify({ deviceId: DEVICE_ID, signature: 'sha256=nothex' })).rejects.toMatchObject({
      response: { error: 'bad_signature' }
    });
  });

  it('locks out every bound device once the server secret is rotated', async () => {
    const { service } = createService({ serverSecret: 'rotated-server-secret' });

    await expect(service.identify({ deviceId: DEVICE_ID, signature: validSignature })).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: 'bad_signature' }
    });
  });

  it('returns the device with its account for well-formed credentials', async () => {
    const { service } = createService();

    await expect(service.identify({ deviceId: DEVICE_ID, signature: validSignature })).resolves.toMatchObject({ id: DEVICE_ID, accountId: 12345n });
  });
});

const NOW = new Date('2026-09-27T12:00:00.000Z');
const PATH = '/mod/ingest';
const VISIBILITY = 'x-otmetki-visibility';

type SignedRequestInput = {
  key?: string;
  body?: Buffer;
  signedBody?: Buffer;
  path?: string;
  signedPath?: string;
  timestamp?: string;
  nonce?: string;
  sent?: Record<string, string>;
  signed?: SignedHeader[];
};

const signedRequest = ({
  key = secret,
  body = BODY,
  signedBody = body,
  path = PATH,
  signedPath = path,
  timestamp = String(NOW.getTime() / 1000),
  nonce = 'nonce-0123456789abcdef',
  sent = {},
  signed = []
}: SignedRequestInput = {}) => {
  const headers: Record<string, string> = {
    ...sent,
    [MOD_DEVICE.header]: DEVICE_ID,
    [MOD_DEVICE.signatureHeader]: signatureOf({
      key,
      body: signedMessage({ method: 'POST', path: signedPath, timestamp, nonce, headers: signed, body: signedBody })
    }),
    [MOD_DEVICE.timestampHeader]: timestamp,
    [MOD_DEVICE.nonceHeader]: nonce
  };

  return { request: { method: 'POST', originalUrl: path, header: (name: string) => headers[name] }, rawBody: body };
};

describe('ModDeviceService.authenticate', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('accepts a request signed with the device secret', async () => {
    const { service } = createService();

    await expect(service.authenticate(signedRequest())).resolves.toMatchObject({ id: DEVICE_ID });
  });

  it('rejects a body that differs from the one signed', async () => {
    const { service } = createService();

    await expect(service.authenticate(signedRequest({ signedBody: Buffer.from('{"events":[1]}') }))).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: 'bad_signature' }
    });
  });

  it('rejects a signed request replayed against another path', async () => {
    const { service } = createService();

    await expect(service.authenticate(signedRequest({ signedPath: '/mod/settings' }))).rejects.toMatchObject({
      response: { error: 'bad_signature' }
    });
  });

  it('rejects a request signed with another device secret', async () => {
    const { service } = createService();

    await expect(
      service.authenticate(signedRequest({ key: deviceSecret({ deviceId: 'dev_other', serverSecret: SERVER_SECRET }) }))
    ).rejects.toMatchObject({
      response: { error: 'bad_signature' }
    });
  });

  it('rejects a request whose raw body was not captured', async () => {
    const { service } = createService();
    const { request } = signedRequest();

    await expect(service.authenticate({ request, rawBody: undefined })).rejects.toMatchObject({ response: { error: 'bad_signature' } });
  });

  it('rejects a request without a usable nonce', async () => {
    const { service } = createService();

    await expect(service.authenticate(signedRequest({ nonce: 'short' }))).rejects.toMatchObject({ response: { error: 'bad_signature' } });
  });

  it('asks the mod to retry a request signed outside the allowed clock skew', async () => {
    const { service } = createService();
    const stale = String(NOW.getTime() / 1000 - MOD_REQUEST.maxSkewSeconds - 1);

    await expect(service.authenticate(signedRequest({ timestamp: stale }))).rejects.toMatchObject({
      status: HttpStatus.PRECONDITION_REQUIRED,
      response: { error: 'stale_request' }
    });
  });

  it('accepts a signed header the mod sent and signed', async () => {
    const { service } = createService();
    const signed = signedRequest({ sent: { [VISIBILITY]: 'public' }, signed: [{ name: VISIBILITY, value: 'public' }] });

    await expect(service.authenticate({ ...signed, signedHeaders: [VISIBILITY] })).resolves.toMatchObject({ id: DEVICE_ID });
  });

  it('rejects a signed header changed on the way', async () => {
    const { service } = createService();
    const signed = signedRequest({ sent: { [VISIBILITY]: 'public' }, signed: [{ name: VISIBILITY, value: 'private' }] });

    await expect(service.authenticate({ ...signed, signedHeaders: [VISIBILITY] })).rejects.toMatchObject({ response: { error: 'bad_signature' } });
  });

  it('rejects a request whose signed header was stripped', async () => {
    const { service } = createService();
    const signed = signedRequest({ signed: [{ name: VISIBILITY, value: 'public' }] });

    await expect(service.authenticate({ ...signed, signedHeaders: [VISIBILITY] })).rejects.toMatchObject({ response: { error: 'bad_signature' } });
  });

  it('rejects a header added to a request signed without it', async () => {
    const { service } = createService();
    const signed = signedRequest({ sent: { [VISIBILITY]: 'public' } });

    await expect(service.authenticate({ ...signed, signedHeaders: [VISIBILITY] })).rejects.toMatchObject({ response: { error: 'bad_signature' } });
  });

  it('refuses the same signed request a second time', async () => {
    const { service } = createService();

    await service.authenticate(signedRequest());

    await expect(service.authenticate(signedRequest())).rejects.toMatchObject({
      status: HttpStatus.CONFLICT,
      response: { error: 'replayed_request' }
    });
  });
});

const bodySchema = z.object({ device_id: z.string(), account_id: z.number() });

const bodyRequest = (payload: Record<string, unknown>) => {
  const rawBody = Buffer.from(JSON.stringify(payload));
  const { request } = signedRequest({ body: rawBody });

  return Object.assign(mock<RawBodyRequest<Request>>(), { ...request, body: payload, rawBody });
};

describe('ModDeviceService.authenticateBody', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns the device with the parsed body when both ids match it', async () => {
    const { service } = createService();
    const payload = { device_id: DEVICE_ID, account_id: 12345 };

    await expect(service.authenticateBody({ request: bodyRequest(payload), schema: bodySchema })).resolves.toMatchObject({
      device: { id: DEVICE_ID },
      body: payload
    });
  });

  it('refuses a body that breaks the schema with the first issue as the message', async () => {
    const { service } = createService();

    await expect(service.authenticateBody({ request: bodyRequest({ device_id: DEVICE_ID }), schema: bodySchema })).rejects.toMatchObject({
      status: HttpStatus.BAD_REQUEST,
      response: { error: 'invalid_payload', message: expect.any(String) }
    });
  });

  it('refuses a body signed by one device on behalf of another', async () => {
    const { service } = createService();

    await expect(
      service.authenticateBody({ request: bodyRequest({ device_id: 'dev_other', account_id: 12345 }), schema: bodySchema })
    ).rejects.toMatchObject({ status: HttpStatus.FORBIDDEN, response: { error: 'account_mismatch' } });
  });

  it('refuses a body for an account the device is not bound to', async () => {
    const { service } = createService();

    await expect(
      service.authenticateBody({ request: bodyRequest({ device_id: DEVICE_ID, account_id: 1 }), schema: bodySchema })
    ).rejects.toMatchObject({
      status: HttpStatus.FORBIDDEN,
      response: { error: 'account_mismatch' }
    });
  });
});

describe('ModDeviceService.list', () => {
  it('serialises account ids as numbers and keeps unset dates null', async () => {
    const { service, prisma } = createService();
    const seen = new Date('2026-05-02T08:00:00.000Z');

    prisma.modDevice.findMany.mockResolvedValue([device({ lastSeenAt: seen }), device({ id: 'dev_orphan', accountId: null })]);

    const [bound, orphan] = await service.list('user');

    expect(bound).toMatchObject({ accountId: 12345, lastSeenAt: seen.toISOString(), revokedAt: null, createdAt: device().createdAt.toISOString() });
    expect(orphan?.accountId).toBeNull();
  });
});

describe('ModDeviceService.revoke', () => {
  it('revokes only an active device owned by the user', async () => {
    const { service, prisma } = createService();

    prisma.modDevice.updateMany.mockResolvedValue({ count: 1 });

    await service.revoke({ userId: 'user', deviceId: DEVICE_ID });

    expect(prisma.modDevice.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: DEVICE_ID, userId: 'user', revokedAt: null },
        data: { revokedAt: expect.any(Date) }
      })
    );
  });

  it('reports not found for a device that is foreign or already revoked', async () => {
    const { service, prisma } = createService();

    prisma.modDevice.updateMany.mockResolvedValue({ count: 0 });

    await expect(service.revoke({ userId: 'user', deviceId: DEVICE_ID })).rejects.toBeInstanceOf(AppNotFoundException);
  });
});
