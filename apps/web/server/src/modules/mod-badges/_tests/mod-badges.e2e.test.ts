import type { INestApplication } from '@nestjs/common';

import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { modBadgePreferenceAnswerSchema, modBadgesSchema } from '@otmetki/schemas';
import RedisMock from 'ioredis-mock';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';
import { z } from 'zod';

import type { ModDevice, Player } from '../../../../generated';

import { AllExceptionsFilter } from '../../../common/filters';
import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { deviceSecret, hashSecret, MOD_DEVICE, ModDeviceService, signedMessage } from '../../mod';
import { ModBadgesController } from '../mod-badges.controller';
import { ModBadgeWriterService } from '../services/mod-badge-writer.service';
import { ModBadgesReaderService } from '../services/mod-badges-reader.service';

const SERVER_SECRET = 'server-secret-for-tests';
const DEVICE_ID = 'dev_badges';
const ACCOUNT_ID = 12_345_678;
const OTHER_ACCOUNT_ID = 23_456_789;
const SECRET = deviceSecret({ deviceId: DEVICE_ID, serverSecret: SERVER_SECRET });

const contractSchema = z.object({ definitions: z.object({ accountIds: z.object({ maxItems: z.number() }) }) });
const contract = contractSchema.parse(
  JSON.parse(readFileSync(new URL('../../../../../../game/modpack/contract/badges.schema.json', import.meta.url), 'utf8'))
);

const contractExample: unknown = JSON.parse(
  readFileSync(new URL('../../../../../../game/modpack/contract/examples/badges.example.json', import.meta.url), 'utf8')
);

const storedDevice: ModDevice = {
  id: DEVICE_ID,
  userId: 'user',
  accountId: BigInt(ACCOUNT_ID),
  name: null,
  secretHash: hashSecret(SECRET),
  modVersion: '0.8.4',
  gameVersion: '1.45.0',
  badgeVisible: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date('2026-09-01T12:00:00.000Z')
};

type SignedPostInput = {
  path: string;
  body: unknown;
};

const prisma = mockDeep<PrismaService>();
const config = mock<AppConfigService>();

let app: INestApplication;

const signedPost = ({ path, body }: SignedPostInput) => {
  const raw = Buffer.from(JSON.stringify(body));
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(16).toString('hex');
  const message = signedMessage({ method: 'POST', path, timestamp, nonce, body: raw });

  return request(app.getHttpServer())
    .post(path)
    .set('Content-Type', 'application/json')
    .set(MOD_DEVICE.header, DEVICE_ID)
    .set(MOD_DEVICE.timestampHeader, timestamp)
    .set(MOD_DEVICE.nonceHeader, nonce)
    .set(MOD_DEVICE.signatureHeader, `sha256=${createHmac('sha256', SECRET).update(message).digest('hex')}`)
    .send(raw.toString());
};

beforeAll(async () => {
  config.get.mockReturnValue(SERVER_SECRET);

  const moduleRef = await Test.createTestingModule({
    controllers: [ModBadgesController],
    providers: [
      ModDeviceService,
      ModBadgesReaderService,
      ModBadgeWriterService,
      { provide: PrismaService, useValue: prisma },
      { provide: AppConfigService, useValue: config },
      { provide: REDIS, useValue: new RedisMock() },
      { provide: APP_PIPE, useClass: ZodValidationPipe },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
      { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }
    ]
  }).compile();

  app = moduleRef.createNestApplication({ rawBody: true });
  await app.init();
});

beforeEach(() => {
  prisma.modDevice.findUnique.mockResolvedValue(storedDevice);
  prisma.modDevice.findMany.mockResolvedValue([]);
  prisma.player.findMany.mockResolvedValue([]);
});

afterAll(async () => {
  await app.close();
});

describe('the badges contract', () => {
  it('has an example the answer schema parses', () => {
    expect(modBadgesSchema.safeParse(contractExample).success).toBe(true);
  });

  it('allows as many account ids as the server schema', async () => {
    const ids = Array.from({ length: contract.definitions.accountIds.maxItems }, (_, index) => index + 1);

    const response = await signedPost({ path: '/mod/badges', body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, account_ids: ids } });

    expect(response.status).toBe(200);
  });
});

describe('POST /mod/badges', () => {
  it('answers the asked accounts that reported the badge on', async () => {
    prisma.modDevice.findMany.mockResolvedValue([mock<ModDevice>({ accountId: BigInt(OTHER_ACCOUNT_ID), badgeVisible: true })]);

    const response = await signedPost({
      path: '/mod/badges',
      body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, account_ids: [OTHER_ACCOUNT_ID, 7] }
    });

    expect(modBadgesSchema.parse(response.body)).toEqual({ account_ids: [OTHER_ACCOUNT_ID] });
  });

  it('reads only active, reported devices of the asked accounts seen within the activity window', async () => {
    await signedPost({ path: '/mod/badges', body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, account_ids: [OTHER_ACCOUNT_ID] } });

    const where = prisma.modDevice.findMany.mock.calls.at(-1)?.[0]?.where;

    expect(where).toMatchObject({ accountId: { in: [BigInt(OTHER_ACCOUNT_ID)] }, revokedAt: null, badgeVisible: { not: null } });
  });

  it('leaves out a player hidden by a deletion request', async () => {
    prisma.modDevice.findMany.mockResolvedValue([mock<ModDevice>({ accountId: BigInt(OTHER_ACCOUNT_ID), badgeVisible: true })]);
    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: BigInt(OTHER_ACCOUNT_ID) })]);

    const response = await signedPost({
      path: '/mod/badges',
      body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, account_ids: [OTHER_ACCOUNT_ID] }
    });

    expect(response.body).toEqual({ account_ids: [] });
  });

  it('refuses a body with anything beyond the account ids', async () => {
    const response = await signedPost({
      path: '/mod/badges',
      body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, account_ids: [OTHER_ACCOUNT_ID], vehicles: [1] }
    });

    expect(response.status).toBe(400);
  });

  it('refuses a body naming another account than the device', async () => {
    const response = await signedPost({
      path: '/mod/badges',
      body: { device_id: DEVICE_ID, account_id: OTHER_ACCOUNT_ID, account_ids: [ACCOUNT_ID] }
    });

    expect(response.status).toBe(403);
  });

  it('refuses an unsigned request', async () => {
    const response = await request(app.getHttpServer())
      .post('/mod/badges')
      .send({ device_id: DEVICE_ID, account_id: ACCOUNT_ID, account_ids: [OTHER_ACCOUNT_ID] });

    expect(response.status).toBe(401);
  });
});

describe('POST /mod/badges/preference', () => {
  it('stores the switch on the device and answers it', async () => {
    const response = await signedPost({ path: '/mod/badges/preference', body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, visible: false } });

    expect(modBadgePreferenceAnswerSchema.parse(response.body)).toEqual({ account_id: ACCOUNT_ID, visible: false });
    expect(prisma.modDevice.update.mock.calls.at(-1)?.[0]).toMatchObject({ where: { id: DEVICE_ID }, data: { badgeVisible: false } });
  });
});
