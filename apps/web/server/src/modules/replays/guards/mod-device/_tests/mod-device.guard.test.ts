import type { ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';

import { HttpStatus } from '@nestjs/common';
import RedisMock from 'ioredis-mock';
import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ModDevice } from '../../../../../../generated';
import type { AppConfigService } from '../../../../../config';
import type { PrismaService } from '../../../../../core';

import { AppBadRequestException } from '../../../../../common/exceptions';
import { deviceSecret, hashSecret, MOD_DEVICE, ModDeviceService } from '../../../../mod';
import { REPLAY_UPLOAD } from '../../../config';
import { ModDeviceGuard } from '../mod-device.guard';

const SERVER_SECRET = 'server-secret-for-tests';
const DEVICE_ID = 'dev_test';
const secret = deviceSecret({ deviceId: DEVICE_ID, serverSecret: SERVER_SECRET });
const signature = `sha256=${createHmac('sha256', secret).update('replay').digest('hex')}`;
const uploadLimit = REPLAY_UPLOAD.maxBytes + REPLAY_UPLOAD.multipartOverheadBytes;

const boundDevice: ModDevice = {
  id: DEVICE_ID,
  userId: 'user',
  accountId: 12345n,
  name: null,
  secretHash: hashSecret(secret),
  modVersion: null,
  gameVersion: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date('2026-05-01T12:00:00.000Z')
};

const contextFor = (headers: Record<string, string>) => {
  const http = mock<HttpArgumentsHost>();
  const context = mock<ExecutionContext>();

  http.getRequest.mockReturnValue({ header: (name: string) => headers[name.toLowerCase()] });
  context.switchToHttp.mockReturnValue(http);

  return context;
};

const createGuard = (stored: ModDevice | null = boundDevice) => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();

  config.get.mockReturnValue(SERVER_SECRET);
  prisma.modDevice.findUnique.mockResolvedValue(stored);

  return { guard: new ModDeviceGuard(new ModDeviceService(prisma, config, new RedisMock())), prisma };
};

const credentials = { [MOD_DEVICE.header]: DEVICE_ID, [MOD_DEVICE.signatureHeader]: signature };

describe('ModDeviceGuard', () => {
  it('lets a bound device with a valid signature upload', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(contextFor(credentials))).resolves.toBe(true);
  });

  it('rejects an upload without device credentials', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(contextFor({}))).rejects.toMatchObject({ status: HttpStatus.UNAUTHORIZED, response: { error: 'unknown_device' } });
  });

  it('rejects an upload from an unknown device', async () => {
    const { guard } = createGuard(null);

    await expect(guard.canActivate(contextFor(credentials))).rejects.toMatchObject({ response: { error: 'unknown_device' } });
  });

  it('rejects an upload with a malformed signature', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(contextFor({ ...credentials, [MOD_DEVICE.signatureHeader]: 'garbage' }))).rejects.toMatchObject({
      status: HttpStatus.UNAUTHORIZED,
      response: { error: 'bad_signature' }
    });
  });

  it('rejects an oversized upload before looking the device up', async () => {
    const { guard, prisma } = createGuard();

    await expect(guard.canActivate(contextFor({ ...credentials, 'content-length': String(uploadLimit + 1) }))).rejects.toBeInstanceOf(
      AppBadRequestException
    );

    expect(prisma.modDevice.findUnique).not.toHaveBeenCalled();
  });

  it('allows an upload declared exactly at the size limit', async () => {
    const { guard } = createGuard();

    await expect(guard.canActivate(contextFor({ ...credentials, 'content-length': String(uploadLimit) }))).resolves.toBe(true);
  });

  it('ignores a non-numeric content length and still checks the device', async () => {
    const { guard, prisma } = createGuard();

    await expect(guard.canActivate(contextFor({ ...credentials, 'content-length': 'lots' }))).resolves.toBe(true);
    expect(prisma.modDevice.findUnique).toHaveBeenCalled();
  });
});
