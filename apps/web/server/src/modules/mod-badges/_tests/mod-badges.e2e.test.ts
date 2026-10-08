import type { INestApplication } from '@nestjs/common';

import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { modBadgePreferenceAnswerSchema, modBadgesSchema } from '@otmetki/schemas';
import RedisMock from 'ioredis-mock';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { range } from 'remeda';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';
import { z } from 'zod';

import type { DataDeletionRequest, ModDevice, Player } from '../../../../generated';

import { AllExceptionsFilter } from '../../../common/filters';
import { modPresenceKey } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { PurgeGuardService } from '../../collector/purge';
import { deviceSecret, hashSecret, MOD_DEVICE, ModDeviceService, signedMessage } from '../../mod';
import { MOD_BADGE_PRESENCE } from '../config/badge-presence.constants';
import { MOD_BADGES_QUOTA } from '../config/mod-badges.constants';
import { ModBadgePresenceController } from '../mod-badge-presence.controller';
import { ModBadgesController } from '../mod-badges.controller';
import { ModBadgePresenceReaderService } from '../services/mod-badge-presence-reader.service';
import { ModBadgePresenceWriterService } from '../services/mod-badge-presence-writer.service';
import { ModBadgeQuotaWriterService } from '../services/mod-badge-quota-writer.service';
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

type PresenceBody = {
  account_id: number;
  visible: boolean;
  account_ids: number[];
};

type SignedPostInput = {
  path: string;
  body: unknown;
};

const prisma = mockDeep<PrismaService>();
const config = mock<AppConfigService>();
const redis = new RedisMock();

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

const presencePost = (body: PresenceBody | Record<string, unknown>) => request(app.getHttpServer()).post('/mod/badges/presence').send(body);

beforeAll(async () => {
  config.get.mockReturnValue(SERVER_SECRET);

  const moduleRef = await Test.createTestingModule({
    controllers: [ModBadgesController, ModBadgePresenceController],
    providers: [
      ModDeviceService,
      ModBadgesReaderService,
      ModBadgeWriterService,
      ModBadgeQuotaWriterService,
      ModBadgePresenceReaderService,
      ModBadgePresenceWriterService,
      PurgeGuardService,
      { provide: PrismaService, useValue: prisma },
      { provide: AppConfigService, useValue: config },
      { provide: REDIS, useValue: redis },
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
  prisma.dataDeletionRequest.findMany.mockResolvedValue([]);
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
  it('turns a device away with Retry-After once it used up its daily distinct accounts', async () => {
    const quota = app.get(ModBadgeQuotaWriterService);
    const asked = Array.from({ length: MOD_BADGES_QUOTA.distinctIdsPerDay }, (_, index) => index + 1);

    await quota.claim({ subject: DEVICE_ID, accountIds: asked, now: new Date() });

    const response = await signedPost({
      path: '/mod/badges',
      body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, account_ids: [OTHER_ACCOUNT_ID] }
    });

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({ error: 'rate_limited' });
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

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

describe('POST /mod/badges/presence', () => {
  it('answers without a device or a signature', async () => {
    const response = await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: [OTHER_ACCOUNT_ID] });

    expect(modBadgesSchema.parse(response.body)).toEqual({ account_ids: [] });
  });

  it('remembers the sender for the activity window when its badge is on', async () => {
    await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: [] });

    expect(await redis.get(modPresenceKey(ACCOUNT_ID))).toBe(MOD_BADGE_PRESENCE.value);
    expect(await redis.ttl(modPresenceKey(ACCOUNT_ID))).toBe(MOD_BADGE_PRESENCE.ttlSeconds);
  });

  it('forgets the sender as soon as it turns the badge off', async () => {
    await redis.set(modPresenceKey(ACCOUNT_ID), MOD_BADGE_PRESENCE.value);
    await presencePost({ account_id: ACCOUNT_ID, visible: false, account_ids: [] });

    expect(await redis.exists(modPresenceKey(ACCOUNT_ID))).toBe(0);
  });

  it('marks an asked player that reported its presence, with no binding', async () => {
    await redis.set(modPresenceKey(OTHER_ACCOUNT_ID), MOD_BADGE_PRESENCE.value);

    const response = await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: [OTHER_ACCOUNT_ID, 7] });

    expect(response.body).toEqual({ account_ids: [OTHER_ACCOUNT_ID] });
  });

  it('does not mark a bound player that never reported its presence', async () => {
    prisma.modDevice.findMany.mockResolvedValue([mock<ModDevice>({ accountId: BigInt(OTHER_ACCOUNT_ID), badgeVisible: true })]);

    const response = await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: [OTHER_ACCOUNT_ID] });

    expect(response.body).toEqual({ account_ids: [] });
  });

  it('leaves out a player hidden on the site', async () => {
    await redis.set(modPresenceKey(OTHER_ACCOUNT_ID), MOD_BADGE_PRESENCE.value);
    prisma.player.findMany.mockResolvedValue([mock<Player>({ accountId: BigInt(OTHER_ACCOUNT_ID) })]);

    const response = await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: [OTHER_ACCOUNT_ID] });

    expect(response.body).toEqual({ account_ids: [] });
  });

  it('never stores a presence for a sender with a deletion request', async () => {
    prisma.dataDeletionRequest.findMany.mockResolvedValue([mock<DataDeletionRequest>({ accountId: BigInt(ACCOUNT_ID) })]);

    await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: [] });

    expect(await redis.exists(modPresenceKey(ACCOUNT_ID))).toBe(0);
  });

  it('drops the stored presence of a sender with a deletion request', async () => {
    await redis.set(modPresenceKey(ACCOUNT_ID), MOD_BADGE_PRESENCE.value);
    prisma.dataDeletionRequest.findMany.mockResolvedValue([mock<DataDeletionRequest>({ accountId: BigInt(ACCOUNT_ID) })]);

    await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: [] });

    expect(await redis.exists(modPresenceKey(ACCOUNT_ID))).toBe(0);
  });

  it('leaves out a player with a deletion request even after its player row is purged', async () => {
    await redis.set(modPresenceKey(OTHER_ACCOUNT_ID), MOD_BADGE_PRESENCE.value);
    prisma.dataDeletionRequest.findMany.mockResolvedValue([mock<DataDeletionRequest>({ accountId: BigInt(OTHER_ACCOUNT_ID) })]);

    const response = await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: [OTHER_ACCOUNT_ID] });

    expect(response.body).toEqual({ account_ids: [] });
  });

  it('ignores the presence of one more own account past the daily cap of an address', async () => {
    const reported = range(1, MOD_BADGES_QUOTA.ownIdsPerDay + 2).map((index) => 90_000_000 + index);

    for (const accountId of reported) {
      await presencePost({ account_id: accountId, visible: true, account_ids: [] });
    }

    expect(await redis.exists(modPresenceKey(reported.at(-1) ?? 0))).toBe(0);
  });

  it('still answers the lookup of an address past its own-account cap', async () => {
    await redis.set(modPresenceKey(OTHER_ACCOUNT_ID), MOD_BADGE_PRESENCE.value);

    const response = await presencePost({ account_id: 91_000_000, visible: true, account_ids: [OTHER_ACCOUNT_ID] });

    expect(response.body).toEqual({ account_ids: [OTHER_ACCOUNT_ID] });
  });

  it('turns a client address away with Retry-After once it used up its daily distinct accounts', async () => {
    const asked = Array.from({ length: MOD_BADGES_QUOTA.distinctIdsPerDay }, (_, index) => index + 1);
    const batch = contract.definitions.accountIds.maxItems;

    for (let start = 0; start < asked.length; start += batch) {
      await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: asked.slice(start, start + batch) });
    }

    const response = await presencePost({ account_id: ACCOUNT_ID, visible: true, account_ids: [OTHER_ACCOUNT_ID] });

    expect(response.status).toBe(429);
    expect(response.body).toMatchObject({ error: 'rate_limited' });
    expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);
  });

  it('refuses a body carrying a device id', async () => {
    const response = await presencePost({ device_id: DEVICE_ID, account_id: ACCOUNT_ID, visible: true, account_ids: [] });

    expect(response.status).toBe(400);
  });
});
