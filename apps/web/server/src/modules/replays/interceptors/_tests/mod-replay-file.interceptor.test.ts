import type { CallHandler, ExecutionContext } from '@nestjs/common';
import type { HttpArgumentsHost } from '@nestjs/common/interfaces';
import type { Request, Response } from 'express';
import type { ClientRequest, Server } from 'node:http';

import express from 'express';
import RedisMock from 'ioredis-mock';
import { createHmac } from 'node:crypto';
import { request as httpRequest } from 'node:http';
import { sum } from 'remeda';
import { lastValueFrom, Observable, of } from 'rxjs';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { ModDevice } from '../../../../../generated';
import type { AppConfigService } from '../../../../config';
import type { PrismaService } from '../../../../core';
import type { ModUploadRequest } from '../replay-file.interceptor.types';

import { deviceSecret, hashSecret, MOD_DEVICE, ModDeviceService, signedMessage } from '../../../mod';
import { REPLAY_UPLOAD } from '../../config/upload.constants';
import { ModReplayFileInterceptor } from '../mod-replay-file.interceptor';

const SERVER_SECRET = 'server-secret-for-tests';
const DEVICE_ID = 'dev_victim0000000';
const REPLAY = Buffer.from('replay bytes');
const secret = deviceSecret({ deviceId: DEVICE_ID, serverSecret: SERVER_SECRET });

const boundDevice: ModDevice = {
  id: DEVICE_ID,
  userId: 'user',
  accountId: 12345n,
  name: null,
  secretHash: hashSecret(secret),
  modVersion: null,
  gameVersion: null,
  badgeVisible: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date('2026-05-01T12:00:00.000Z')
};

type HoldOpenInput = {
  server: Server;
  address: string;
};

type UploadInput = {
  key?: string;
  address: string;
  nonce?: string;
};

const contextOf = ({ req, res }: { req: Request; res: Response }) => {
  const context = mock<ExecutionContext>();
  const http = mock<HttpArgumentsHost>();

  http.getRequest.mockReturnValue(req);
  http.getResponse.mockReturnValue(res);
  context.switchToHttp.mockReturnValue(http);

  return context;
};

const appWithInterceptor = (handle: (req: ModUploadRequest) => Observable<unknown> = () => of(null)) => {
  const prisma = mockDeep<PrismaService>();
  const config = mock<AppConfigService>();

  config.get.mockReturnValue(SERVER_SECRET);
  prisma.modDevice.findUnique.mockResolvedValue(boundDevice);

  const interceptor = new ModReplayFileInterceptor(new RedisMock(), new ModDeviceService(prisma, config, new RedisMock()));
  const handled = vi.fn(handle);
  const app = express();

  app.set('trust proxy', true);

  app.post('/replays/mod', (req, res) => {
    const next = mock<CallHandler>();

    next.handle.mockImplementation(() => handled(req));

    Promise.resolve(interceptor.intercept(contextOf({ req, res }), next))
      .then(lastValueFrom)
      .then(
        () => res.status(201).end(),
        (error: { status?: number }) => res.status(error.status ?? 500).end()
      );
  });

  return { app, handled };
};

let nonceCounter = 0;

const upload = (
  app: express.Express | Server,
  { key = secret, address, nonce = `nonce-${String(nonceCounter++).padStart(16, '0')}` }: UploadInput
) => {
  const timestamp = String(Math.floor(Date.now() / 1000));
  const message = signedMessage({ method: 'POST', path: '/replays/mod', timestamp, nonce, body: REPLAY });

  return request(app)
    .post('/replays/mod')
    .set('X-Forwarded-For', address)
    .set(MOD_DEVICE.header, DEVICE_ID)
    .set(MOD_DEVICE.timestampHeader, timestamp)
    .set(MOD_DEVICE.nonceHeader, nonce)
    .set(MOD_DEVICE.signatureHeader, `sha256=${createHmac('sha256', key).update(message).digest('hex')}`)
    .attach(REPLAY_UPLOAD.field, REPLAY, 'battle.mtreplay');
};

const holdOpen = ({ server, address }: HoldOpenInput): ClientRequest => {
  const bound = server.address();
  const port = typeof bound === 'object' && bound !== null ? bound.port : 0;
  const open = httpRequest({
    port,
    method: 'POST',
    path: '/replays/mod',
    headers: {
      'x-forwarded-for': address,
      [MOD_DEVICE.header]: DEVICE_ID,
      [MOD_DEVICE.timestampHeader]: String(Math.floor(Date.now() / 1000)),
      [MOD_DEVICE.nonceHeader]: `nonce-held-${String(nonceCounter++).padStart(10, '0')}`,
      'content-type': 'multipart/form-data; boundary=held'
    }
  });

  open.on('error', () => undefined);
  open.write(`--held\r\nContent-Disposition: form-data; name="${REPLAY_UPLOAD.field}"; filename="battle.mtreplay"\r\n\r\npartial`);

  return open;
};

const heldSlots = async () => {
  const redis = new RedisMock();
  const keys = await redis.keys(`${REPLAY_UPLOAD.concurrency.keyPrefix}*`);
  const counts = await Promise.all(keys.map((key) => redis.get(key)));

  return sum(counts.map(Number));
};

const pendingHandler = () => {
  const pending: (() => void)[] = [];
  const handle = () =>
    new Observable((subscriber) => {
      pending.push(() => {
        subscriber.next(null);
        subscriber.complete();
      });
    });

  return { pending, handle };
};

const waitFor = async (pending: unknown[], count: number) => {
  while (pending.length < count) {
    await new Promise((resolve) => setImmediate(resolve));
  }
};

describe('ModReplayFileInterceptor', () => {
  it('hands a replay signed with the device secret to the handler with the device attached', async () => {
    const devices: (string | undefined)[] = [];
    const { app } = appWithInterceptor((req) => {
      devices.push(req.modDevice?.id);

      return of(null);
    });

    const response = await upload(app, { address: '203.0.113.7' });

    expect(response.status).toBe(201);
    expect(devices).toEqual([DEVICE_ID]);
  });

  it('refuses a replay signed with another key before the handler parses it', async () => {
    const { app, handled } = appWithInterceptor();

    const response = await upload(app, { key: 'leaked-device-id-only', address: '203.0.113.7' });

    expect(response.status).toBe(401);
    expect(handled).not.toHaveBeenCalled();
  });

  it('keeps the slots of a device free for its owner while a stranger with its id holds uploads open elsewhere', async () => {
    const { app } = appWithInterceptor();
    const server = app.listen(0);
    const held = Array.from({ length: REPLAY_UPLOAD.concurrency.perOwner }, () => holdOpen({ server, address: '198.51.100.9' }));

    await vi.waitFor(async () => expect(await heldSlots()).toBe(REPLAY_UPLOAD.concurrency.perOwner));

    const stranger = await upload(server, { key: 'leaked', address: '198.51.100.9' });
    const owner = await upload(server, { address: '203.0.113.7' });

    held.forEach((open) => open.destroy());
    server.close();

    expect([stranger.status, owner.status]).toEqual([429, 201]);
  });

  it('caps the verified uploads of one device across addresses', async () => {
    const { pending, handle } = pendingHandler();
    const { app } = appWithInterceptor(handle);
    const running = Array.from({ length: REPLAY_UPLOAD.concurrency.perOwner }, (_, index) =>
      upload(app, { address: `203.0.113.${index + 1}` }).then((response) => response.status)
    );

    await waitFor(pending, REPLAY_UPLOAD.concurrency.perOwner);

    const refused = await upload(app, { address: '192.0.2.1' });

    pending.forEach((complete) => complete());

    expect(refused.status).toBe(429);
    await expect(Promise.all(running)).resolves.toEqual(Array.from({ length: REPLAY_UPLOAD.concurrency.perOwner }).fill(201));
  });
});
