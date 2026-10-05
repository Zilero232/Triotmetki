import type { INestApplication } from '@nestjs/common';

import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { MOD_RATINGS, modOverviewSchema, modTankRatingsSchema } from '@otmetki/schemas';
import RedisMock from 'ioredis-mock';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { createHmac, randomBytes } from 'node:crypto';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { AccountRating, ModDevice, PlayerTank } from '../../../../generated';
import type { ModRatingsQueries } from '../queries/ratings.types';

import { AllExceptionsFilter } from '../../../common/filters';
import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { ExpectedValuesReaderService } from '../../reference';
import { MOD_DEVICE } from '../config/device.constants';
import { MOD_TOKENS } from '../config/tokens.constants';
import { deviceSecret, hashSecret } from '../lib/device-secret';
import { signedMessage } from '../lib/request-signature';
import { ModRatingsController } from '../mod-ratings.controller';
import { ModDeviceService } from '../services/mod-device.service';
import { ModRatingsReaderService } from '../services/mod-ratings-reader.service';

const SERVER_SECRET = 'server-secret-for-tests';
const DEVICE_ID = 'dev_ratings';
const ACCOUNT_ID = 12_345_678;
const SECRET = deviceSecret({ deviceId: DEVICE_ID, serverSecret: SERVER_SECRET });

const contractExample = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../../../game/modpack/contract/examples/${name}`, import.meta.url), 'utf8'));

const storedDevice: ModDevice = {
  id: DEVICE_ID,
  userId: 'user',
  accountId: BigInt(ACCOUNT_ID),
  name: null,
  secretHash: hashSecret(SECRET),
  modVersion: '0.1.0',
  gameVersion: '1.45.0',
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date('2026-09-01T12:00:00.000Z')
};

type SignedPostInput = {
  path: string;
  body: unknown;
  key?: string;
  signedPath?: string;
};

const prisma = mockDeep<PrismaService>();
const queries = { tankRecords: vi.fn<ModRatingsQueries['tankRecords']>() };
const config = mock<AppConfigService>();
const expectedValues = mock<ExpectedValuesReaderService>();

let app: INestApplication;

const signedPost = ({ path, body, key = SECRET, signedPath = path }: SignedPostInput) => {
  const raw = Buffer.from(JSON.stringify(body));
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(16).toString('hex');
  const message = signedMessage({ method: 'POST', path: signedPath, timestamp, nonce, body: raw });

  return request(app.getHttpServer())
    .post(path)
    .set('Content-Type', 'application/json')
    .set(MOD_DEVICE.header, DEVICE_ID)
    .set(MOD_DEVICE.timestampHeader, timestamp)
    .set(MOD_DEVICE.nonceHeader, nonce)
    .set(MOD_DEVICE.signatureHeader, `sha256=${createHmac('sha256', key).update(message).digest('hex')}`)
    .send(raw.toString());
};

beforeAll(async () => {
  config.get.mockReturnValue(SERVER_SECRET);

  const moduleRef = await Test.createTestingModule({
    imports: [CacheModule.register()],
    controllers: [ModRatingsController],
    providers: [
      ModDeviceService,
      ModRatingsReaderService,
      { provide: PrismaService, useValue: prisma },
      { provide: MOD_TOKENS.ratingsQueries, useValue: queries },
      { provide: AppConfigService, useValue: config },
      { provide: ExpectedValuesReaderService, useValue: expectedValues },
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
  prisma.accountRating.findUnique.mockResolvedValue(null);
  prisma.playSession.findFirst.mockResolvedValue(null);
  prisma.playerTank.findMany.mockResolvedValue([]);
  prisma.accountTankRating.findMany.mockResolvedValue([]);
  prisma.tankSnapshotLatest.findMany.mockResolvedValue([]);
  queries.tankRecords.mockResolvedValue([]);
  expectedValues.all.mockResolvedValue(new Map());
});

afterAll(async () => {
  await app.close();
});

describe('the mod ratings contract examples', () => {
  it('parse against the response schemas the server serialises through', () => {
    expect(modOverviewSchema.safeParse(contractExample('ratings-overview.example.json')).success).toBe(true);
    expect(modTankRatingsSchema.safeParse(contractExample('ratings-tanks.example.json')).success).toBe(true);
  });
});

describe('POST /mod/me/overview', () => {
  it('answers the ratings of the device account for a signed request', async () => {
    prisma.accountRating.findUnique.mockResolvedValue(
      mock<AccountRating & { player: { nickname: string } }>({
        battles: 1000,
        winRate: 52,
        avgDamage: 1500,
        wn8: 1800,
        eff: 1300,
        broneIndex: null,
        computedAt: new Date('2026-09-27T09:00:00.000Z'),
        player: { nickname: 'Tanker' }
      })
    );

    const response = await signedPost({ path: '/mod/me/overview', body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID } });

    expect(response.status).toBe(200);
    expect(modOverviewSchema.parse(response.body)).toMatchObject({ account_id: ACCOUNT_ID, nickname: 'Tanker', overall: { battles: 1000 } });

    expect(prisma.accountRating.findUnique.mock.calls.at(-1)?.[0].where).toEqual({
      accountId_period: { accountId: BigInt(ACCOUNT_ID), period: 'overall' }
    });
  });

  it('refuses a body naming another account than the one the device is bound to', async () => {
    prisma.accountRating.findUnique.mockClear();

    const response = await signedPost({ path: '/mod/me/overview', body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID + 1 } });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'account_mismatch' });
    expect(prisma.accountRating.findUnique).not.toHaveBeenCalled();
  });

  it('refuses a request signed with another key', async () => {
    const response = await signedPost({
      path: '/mod/me/overview',
      body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID },
      key: deviceSecret({ deviceId: 'dev_other', serverSecret: SERVER_SECRET })
    });

    expect(response.status).toBe(401);
    expect(response.body).toMatchObject({ error: 'bad_signature' });
  });

  it('refuses a signature made for the other ratings path', async () => {
    const response = await signedPost({
      path: '/mod/me/tanks',
      signedPath: '/mod/me/overview',
      body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, tank_ids: [1] }
    });

    expect(response.status).toBe(401);
  });
});

describe('POST /mod/me/tanks', () => {
  it('answers the requested own tanks the account has data for', async () => {
    prisma.playerTank.findMany.mockResolvedValue([
      mock<PlayerTank>({ tankId: 1, battles: 10, wins: 6, markOfMastery: 2, marksOnGun: 1, moePercent: 70.5 })
    ]);

    const response = await signedPost({ path: '/mod/me/tanks', body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, tank_ids: [1, 2] } });

    expect(response.status).toBe(200);

    expect(modTankRatingsSchema.parse(response.body)).toEqual({
      account_id: ACCOUNT_ID,
      tanks: [
        {
          tank_id: 1,
          battles: 10,
          win_rate: 60,
          avg_damage: null,
          wn8: { value: null, tier: null },
          moe_percent: 70.5,
          marks_on_gun: 1,
          mastery: 2,
          records: null,
          expected: null
        }
      ]
    });
  });

  it('refuses more tanks than one request may name', async () => {
    const tankIds = Array.from({ length: MOD_RATINGS.maxTanks + 1 }, (_, index) => index + 1);
    const response = await signedPost({ path: '/mod/me/tanks', body: { device_id: DEVICE_ID, account_id: ACCOUNT_ID, tank_ids: tankIds } });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_payload');
  });
});
