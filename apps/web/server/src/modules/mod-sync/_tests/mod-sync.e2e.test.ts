import type { INestApplication } from '@nestjs/common';
import type { ModComponentSet } from '@otmetki/schemas';

import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { MOD_SYNC, modProfilesLibrarySchema, modSetsLibrarySchema, modSyncLibrariesSchema } from '@otmetki/schemas';
import RedisMock from 'ioredis-mock';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { createHmac, randomBytes } from 'node:crypto';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { ModDevice, ModSyncLibrary } from '../../../../generated';

import { AllExceptionsFilter } from '../../../common/filters';
import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { mockPrismaService } from '../../../core/prisma/_tests/prisma-mock';
import { deviceSecret, hashSecret, MOD_DEVICE, ModDeviceService, signedMessage } from '../../mod';
import { ModSyncAccountController } from '../mod-sync-account.controller';
import { ModSyncController } from '../mod-sync.controller';
import { ModSyncService } from '../services';

const SERVER_SECRET = 'server-secret-for-tests';
const DEVICE_ID = 'dev_sync';
const ACCOUNT_ID = 12_345_678;
const USER_ID = 'user-1';
const DEVICE = { device_id: DEVICE_ID, account_id: ACCOUNT_ID };

type SignedInput = {
  method: 'POST' | 'PUT';
  path: string;
  body: unknown;
};

const prisma = mockPrismaService();
const config = mock<AppConfigService>();

const SECRET = deviceSecret({ deviceId: DEVICE_ID, serverSecret: SERVER_SECRET });

let app: INestApplication;

const set = (id: string, updated = 1_000): ModComponentSet => ({ id, name: `Set ${id}`, components: ['core'], created: 1_000, updated });

const signed = ({ method, path, body }: SignedInput) => {
  const raw = Buffer.from(JSON.stringify(body));
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomBytes(16).toString('hex');
  const message = signedMessage({ method, path, timestamp, nonce, body: raw });
  const call = method === 'POST' ? request(app.getHttpServer()).post(path) : request(app.getHttpServer()).put(path);

  return call
    .set('Content-Type', 'application/json')
    .set(MOD_DEVICE.header, DEVICE_ID)
    .set(MOD_DEVICE.timestampHeader, timestamp)
    .set(MOD_DEVICE.nonceHeader, nonce)
    .set(MOD_DEVICE.signatureHeader, `sha256=${createHmac('sha256', SECRET).update(message).digest('hex')}`)
    .send(raw.toString());
};

beforeAll(async () => {
  config.get.mockReturnValue(SERVER_SECRET);

  prisma.modDevice.findUnique.mockResolvedValue({
    id: DEVICE_ID,
    userId: USER_ID,
    accountId: BigInt(ACCOUNT_ID),
    name: null,
    secretHash: hashSecret(SECRET),
    modVersion: 'manager 0.3.0',
    gameVersion: '1.45.0',
    lastSeenAt: null,
    revokedAt: null,
    createdAt: new Date('2026-09-01T12:00:00.000Z')
  } satisfies ModDevice);

  const moduleRef = await Test.createTestingModule({
    controllers: [ModSyncController, ModSyncAccountController],
    providers: [
      ModDeviceService,
      ModSyncService,
      { provide: PrismaService, useValue: prisma },
      { provide: AppConfigService, useValue: config },
      { provide: REDIS, useValue: new RedisMock() },
      { provide: APP_PIPE, useClass: ZodValidationPipe },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
      { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }
    ]
  }).compile();

  app = moduleRef.createNestApplication({ rawBody: true });

  app.use((req: { session?: unknown }, _res: unknown, next: () => void) => {
    req.session = { user: { id: USER_ID } };
    next();
  });

  await app.init();
});

beforeEach(() => {
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  prisma.modSyncLibrary.findUnique.mockResolvedValue(null);
  prisma.modSyncLibrary.upsert.mockReset();

  prisma.modSyncLibrary.upsert.mockResolvedValue({
    id: 'row',
    userId: USER_ID,
    kind: 'sets',
    data: {},
    revision: 1,
    updatedAt: new Date('2026-09-30T12:00:00.000Z')
  } satisfies ModSyncLibrary);
});

afterAll(async () => {
  await app.close();
});

describe('POST /mod/me/sets', () => {
  it('answers an empty library at revision 0 for a user who stored nothing', async () => {
    const response = await signed({ method: 'POST', path: '/mod/me/sets', body: DEVICE });

    expect(response.status).toBe(200);
    expect(modSetsLibrarySchema.parse(response.body)).toEqual({ sets: [], deleted: [], revision: 0, updated_at: null });
    expect(prisma.modSyncLibrary.findUnique.mock.calls.at(-1)?.[0].where).toEqual({ userId_kind: { userId: USER_ID, kind: 'sets' } });
  });

  it('refuses a body naming another account than the bound one', async () => {
    const response = await signed({ method: 'POST', path: '/mod/me/sets', body: { ...DEVICE, account_id: ACCOUNT_ID + 1 } });

    expect(response.status).toBe(403);
    expect(response.body).toMatchObject({ error: 'account_mismatch' });
  });
});

describe('PUT /mod/me/sets', () => {
  it('stores the merged sets and answers them with the new revision', async () => {
    const response = await signed({ method: 'PUT', path: '/mod/me/sets', body: { ...DEVICE, sets: [set('a')], deleted: [], mode: 'merge' } });

    expect(response.status).toBe(200);
    expect(modSetsLibrarySchema.parse(response.body)).toMatchObject({ sets: [set('a')], revision: 1 });
  });

  it('answers invalid_payload for more sets than the library holds', async () => {
    const sets = Array.from({ length: MOD_SYNC.maxSets + 1 }, (_, index) => set(`s${index}`));
    const response = await signed({ method: 'PUT', path: '/mod/me/sets', body: { ...DEVICE, sets, deleted: [], mode: 'merge' } });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_payload');
    expect(prisma.modSyncLibrary.upsert).not.toHaveBeenCalled();
  });

  it('answers invalid_payload for a component id outside the catalogue alphabet', async () => {
    const response = await signed({
      method: 'PUT',
      path: '/mod/me/sets',
      body: { ...DEVICE, sets: [{ ...set('a'), components: ['Core'] }], deleted: [], mode: 'merge' }
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_payload');
  });
});

describe('PUT /mod/me/profiles', () => {
  it('stores the profiles without the settings the mod keeps out of them', async () => {
    const [excluded] = MOD_SYNC.excludedConfigKeys;
    const profile = { id: 'p', name: '  Main  ', created: null, updated: 5, data: { config: { [excluded]: 'x', hud_scale: 1 }, components: {} } };
    const response = await signed({
      method: 'PUT',
      path: '/mod/me/profiles',
      body: { ...DEVICE, profiles: [profile], deleted: [], mode: 'replace' }
    });

    expect(response.status).toBe(200);

    expect(modProfilesLibrarySchema.parse(response.body).profiles).toEqual([
      { ...profile, name: 'Main', data: { config: { hud_scale: 1 }, components: {} } }
    ]);
  });

  it('answers invalid_payload for profile data past the size limit', async () => {
    const data = { config: { blob: 'x'.repeat(MOD_SYNC.maxProfileDataBytes) }, components: {} };
    const response = await signed({
      method: 'PUT',
      path: '/mod/me/profiles',
      body: { ...DEVICE, profiles: [{ id: 'p', name: 'Big', created: 1, updated: 1, data }], deleted: [], mode: 'merge' }
    });

    expect(response.status).toBe(400);
    expect(response.body.error).toBe('invalid_payload');
  });
});

describe('GET /mod/sync', () => {
  it('answers both libraries of the signed-in user', async () => {
    const response = await request(app.getHttpServer()).get('/mod/sync');

    expect(response.status).toBe(200);

    expect(modSyncLibrariesSchema.parse(response.body)).toEqual({
      sets: { sets: [], deleted: [], revision: 0, updated_at: null },
      profiles: { profiles: [], deleted: [], revision: 0, updated_at: null }
    });
  });
});

describe('DELETE /mod/sync', () => {
  it('deletes both libraries of the signed-in user', async () => {
    const response = await request(app.getHttpServer()).delete('/mod/sync');

    expect(response.status).toBe(204);
    expect(prisma.modSyncLibrary.deleteMany).toHaveBeenCalledWith({ where: { userId: USER_ID } });
  });
});
