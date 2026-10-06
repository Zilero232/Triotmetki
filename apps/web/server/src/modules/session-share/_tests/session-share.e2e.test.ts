import type { INestApplication } from '@nestjs/common';

import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { modSessionSharePreferenceAnswerSchema, modSessionShareSentSchema } from '@otmetki/schemas';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { readFileSync } from 'node:fs';
import request from 'supertest';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { SessionSharePreference, User } from '../../../../generated';
import type { AuthenticatedDevice } from '../../mod';
import type { ShareRecipientRow } from '../selects/session-share.selects';

import { AllExceptionsFilter } from '../../../common/filters';
import { PrismaService } from '../../../core';
import { ModDeviceService, sessionUuid } from '../../mod';
import { SessionShareQueueService } from '../services/session-share-queue.service';
import { SessionShareWriterService } from '../services/session-share-writer.service';
import { SessionShareController } from '../session-share.controller';

const DEVICE_ID = 'dev_share';
const ACCOUNT_ID = 12_345_678;
const MOD_SESSION = '0123456789abcdef0123456789abcdef';

const contractExample = (name: string): unknown =>
  JSON.parse(readFileSync(new URL(`../../../../../../game/modpack/contract/examples/${name}`, import.meta.url), 'utf8'));

const device: AuthenticatedDevice = {
  id: DEVICE_ID,
  userId: 'user',
  accountId: BigInt(ACCOUNT_ID),
  name: null,
  secretHash: 'hash',
  modVersion: '0.1.0',
  gameVersion: '1.45.0',
  badgeVisible: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date('2026-09-01T12:00:00.000Z')
};

const prisma = mockDeep<PrismaService>();
const devices = mock<ModDeviceService>();
const queue = mock<SessionShareQueueService>();

let app: INestApplication;

const post = (path: string, body: object) => request(app.getHttpServer()).post(path).send(body);

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [SessionShareController],
    providers: [
      SessionShareWriterService,
      { provide: ModDeviceService, useValue: devices },
      { provide: SessionShareQueueService, useValue: queue },
      { provide: PrismaService, useValue: prisma },
      { provide: APP_PIPE, useClass: ZodValidationPipe },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
      { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }
    ]
  }).compile();

  app = moduleRef.createNestApplication({ rawBody: true });
  await app.init();
});

beforeEach(() => {
  queue.enqueue.mockReset();
  devices.authenticateBody.mockImplementation(async ({ request: incoming, schema }) => ({ device, body: schema.parse(incoming.body) }));
  prisma.user.findUnique.mockResolvedValue(mock<User & ShareRecipientRow>({ locale: 'ru', telegramAccount: { telegramId: 42n }, accounts: [] }));

  prisma.sessionSharePreference.upsert.mockResolvedValue({
    userId: device.userId,
    enabled: true,
    channels: ['telegram'],
    updatedAt: new Date()
  } satisfies SessionSharePreference);
});

afterAll(async () => {
  await app.close();
});

describe('the session share contract example', () => {
  it('parses against the preference answer the server serialises through', () => {
    expect(modSessionSharePreferenceAnswerSchema.safeParse(contractExample('session-share.example.json')).success).toBe(true);
  });
});

describe('POST /mod/me/session-share', () => {
  it('stores the opt-in for the device owner', async () => {
    const response = await post('/mod/me/session-share', { device_id: DEVICE_ID, account_id: ACCOUNT_ID, enabled: true, channels: ['telegram'] });

    expect(response.status).toBe(200);
    expect(modSessionSharePreferenceAnswerSchema.parse(response.body)).toEqual({ account_id: ACCOUNT_ID, enabled: true, channels: ['telegram'] });
    expect(prisma.sessionSharePreference.upsert.mock.calls.at(-1)?.[0].where).toEqual({ userId: device.userId });
  });

  it('answers 409 channel_not_linked for a channel the user has not linked', async () => {
    const response = await post('/mod/me/session-share', { device_id: DEVICE_ID, account_id: ACCOUNT_ID, enabled: true, channels: ['discord'] });

    expect(response.status).toBe(409);
    expect(response.body).toMatchObject({ error: 'channel_not_linked' });
    expect(response.headers['x-otmetki-server-time']).toBeDefined();
  });
});

describe('POST /mod/me/session-share/send', () => {
  it('queues the card of the named own session and answers 202', async () => {
    const id = sessionUuid({ accountId: BigInt(ACCOUNT_ID), sessionId: MOD_SESSION });

    prisma.playSession.findFirst.mockResolvedValue(mock({ id }));

    const response = await post('/mod/me/session-share/send', {
      device_id: DEVICE_ID,
      account_id: ACCOUNT_ID,
      session_id: MOD_SESSION,
      channels: ['telegram']
    });

    expect(response.status).toBe(202);
    expect(modSessionShareSentSchema.parse(response.body)).toEqual({ account_id: ACCOUNT_ID, queued: ['telegram'] });
    expect(queue.enqueue).toHaveBeenCalledWith({ userId: device.userId, sessionId: id, channels: ['telegram'] });
  });
});
