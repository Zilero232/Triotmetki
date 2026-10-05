import type { INestApplication } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { getQueueToken } from '@nestjs/bullmq';
import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { Replay } from '../../../../generated';
import type { AuthenticatedDevice } from '../../mod';

import { AppForbiddenException, ModException } from '../../../common/exceptions';
import { AllExceptionsFilter } from '../../../common/filters';
import { LocalDiskStorage, ObjectStorage, PrismaService } from '../../../core';
import { parseReplaySummary } from '../../../lib/replay';
import { FIXTURE, readFixture } from '../../../lib/replay/_tests/fixtures';
import { EntitlementsService } from '../../billing';
import { ModDeviceService } from '../../mod';
import { REPLAY_UPLOAD, REPLAYS_QUEUE } from '../config';
import { ReplaysController } from '../replays.controller';
import { HeatmapService, ReplayOwnerService, ReplayParseService, ReplayQueryService, ReplayUploadService } from '../services';

const prisma = mockDeep<PrismaService>();
const queue = mock<Queue>();
const entitlements = mock<EntitlementsService>();
const devices = mock<ModDeviceService>();
const replayId = '0b0f9a6e-9a36-4f59-8a61-1d1a4b6a0c11';
const replayRow = (overrides: Partial<Replay>): Replay => ({
  id: replayId,
  uploaderUserId: 'user-1',
  deviceId: null,
  storageKey: 'key',
  timelineKey: null,
  fileName: 'battle.wotreplay',
  fileSize: 1,
  sha256: 'sha',
  status: 'uploaded',
  parseError: null,
  visibility: 'public',
  hiddenAt: null,
  gameVersion: null,
  arenaUniqueId: null,
  arenaId: null,
  battleType: null,
  gameplayMode: null,
  mapName: null,
  vehicleType: null,
  battleId: null,
  accountId: null,
  tankId: null,
  result: null,
  damageDealt: null,
  damageAssisted: null,
  frags: null,
  xp: null,
  medals: [],
  summary: null,
  clanTag: null,
  damageBlocked: null,
  markOfMastery: null,
  tags: [],
  tagsVersion: 0,
  playerAccountIds: [],
  hasTracks: false,
  heatmapAppliedAt: null,
  isFeatured: false,
  views: 0,
  playedAt: null,
  parsedAt: null,
  createdAt: new Date(),
  ...overrides
});

const recorderId = BigInt(parseReplaySummary(readFixture(FIXTURE.wgFull)).recorder.accountId ?? 0);
const boundDevice = (accountId: bigint): AuthenticatedDevice => ({
  id: 'dev_bound',
  userId: 'mod-user',
  accountId,
  name: null,
  secretHash: 'hash',
  modVersion: '1.0.0',
  gameVersion: '1.30.0',
  lastSeenAt: null,
  revokedAt: null,
  createdAt: new Date()
});

let app: INestApplication;
let root: string;
let storage: LocalDiskStorage;

const uploadFromMod = (visibility?: string) => {
  const call = request(app.getHttpServer()).post('/replays/mod');

  return (visibility === undefined ? call : call.set(REPLAY_UPLOAD.visibilityHeader, visibility)).attach(
    'file',
    Buffer.from(readFixture(FIXTURE.wgFull)),
    'battle.wotreplay'
  );
};

beforeAll(async () => {
  prisma.$transaction.mockImplementation(async (run) => (typeof run === 'function' ? run(prisma) : Promise.all(run)));
  root = await mkdtemp(join(tmpdir(), 'otmetki-replays-'));
  storage = new LocalDiskStorage(root);

  const moduleRef = await Test.createTestingModule({
    imports: [CacheModule.register()],
    controllers: [ReplaysController],
    providers: [
      ReplayUploadService,
      { provide: PrismaService, useValue: prisma },
      { provide: ObjectStorage, useValue: storage },
      { provide: ModDeviceService, useValue: devices },
      { provide: EntitlementsService, useValue: entitlements },
      { provide: getQueueToken(REPLAYS_QUEUE.name), useValue: queue },
      { provide: ReplayQueryService, useValue: mock<ReplayQueryService>() },
      { provide: ReplayOwnerService, useValue: mock<ReplayOwnerService>() },
      { provide: HeatmapService, useValue: mock<HeatmapService>() },
      { provide: APP_PIPE, useClass: ZodValidationPipe },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
      { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }
    ]
  }).compile();

  app = moduleRef.createNestApplication();

  app.use((req: { session?: unknown }, _res: unknown, next: () => void) => {
    req.session = { user: { id: 'user-1' } };
    next();
  });

  await app.init();
});

afterAll(async () => {
  await app.close();
  await rm(root, { recursive: true, force: true });
});

describe('POST /replays', () => {
  it('stores the file, records it and queues the parse job, which fills the summary', async () => {
    prisma.replay.findUnique.mockResolvedValueOnce(null);
    prisma.replay.create.mockResolvedValue(replayRow({ id: replayId, status: 'uploaded' }));

    const response = await request(app.getHttpServer())
      .post('/replays')
      .attach('file', Buffer.from(readFixture(FIXTURE.wgFull)), 'battle.wotreplay');

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ id: replayId, status: 'uploaded' });

    const created = prisma.replay.create.mock.calls[0]?.[0].data;

    expect(created?.uploaderUserId).toBe('user-1');
    expect(queue.add).toHaveBeenCalledWith(REPLAYS_QUEUE.jobs.parse, { replayId }, expect.objectContaining({ jobId: `parse-${replayId}` }));

    const stored = await storage.get(String(created?.storageKey));

    expect(stored.byteLength).toBe(readFixture(FIXTURE.wgFull).byteLength);

    prisma.replay.findUnique.mockResolvedValueOnce(replayRow({ id: replayId, storageKey: String(created?.storageKey) }));

    const heatmaps = mock<HeatmapService>();
    const outcome = await new ReplayParseService(prisma, storage, heatmaps).parse({ replayId, isFinalAttempt: true });
    const update = prisma.replay.update.mock.calls.at(-1)?.[0].data;

    expect(outcome).toEqual({ status: 'parsed', hasTracks: true });
    expect(update).toMatchObject({ status: 'parsed', arenaId: '14_siegfried_line', gameplayMode: 'ctf', tankId: 11265, result: 'win' });
    expect(heatmaps.apply).toHaveBeenCalledWith(expect.objectContaining({ replayId, arenaId: '14_siegfried_line', mode: 'ctf' }));
  });

  it('rejects a file that is not a replay', async () => {
    const response = await request(app.getHttpServer()).post('/replays').attach('file', Buffer.from('not a replay'), 'battle.mtreplay');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('REPLAY_INVALID');
  });

  it('rejects another extension before reading it', async () => {
    const response = await request(app.getHttpServer())
      .post('/replays')
      .attach('file', Buffer.from(readFixture(FIXTURE.wgFull)), 'battle.zip');

    expect(response.status).toBe(400);
  });

  it('refuses an upload over the stored replays limit of the plan', async () => {
    prisma.replay.findUnique.mockResolvedValueOnce(null);
    prisma.replay.count.mockResolvedValueOnce(50);
    entitlements.assertWithinLimit.mockRejectedValueOnce(new AppForbiddenException('SUBSCRIPTION_REQUIRED', 'The storedReplays limit is reached'));
    prisma.replay.create.mockClear();

    const response = await request(app.getHttpServer())
      .post('/replays')
      .attach('file', Buffer.from(readFixture(FIXTURE.wgFull)), 'battle.wotreplay');

    expect(response.status).toBe(403);
    expect(entitlements.assertWithinLimit).toHaveBeenCalledWith({ userId: 'user-1', key: 'storedReplays', count: 50 });
    expect(prisma.replay.create).not.toHaveBeenCalled();
  });

  it('answers 409 for a replay uploaded before without naming the other upload', async () => {
    prisma.replay.findUnique.mockResolvedValueOnce(replayRow({ id: replayId }));

    const response = await request(app.getHttpServer())
      .post('/replays')
      .attach('file', Buffer.from(readFixture(FIXTURE.wgFull)), 'battle.wotreplay');

    expect(response.status).toBe(409);
    expect(JSON.stringify(response.body)).not.toContain(replayId);
  });
});

describe('POST /replays/mod', () => {
  it('turns away an unknown device before reading the file', async () => {
    devices.identify.mockRejectedValueOnce(new AppForbiddenException('FORBIDDEN', 'unknown device'));
    devices.authenticate.mockClear();

    const response = await request(app.getHttpServer())
      .post('/replays/mod')
      .set('X-Device-Id', 'nobody')
      .attach('file', Buffer.from(readFixture(FIXTURE.wgFull)), 'battle.wotreplay');

    expect(response.status).toBe(403);
    expect(devices.authenticate).not.toHaveBeenCalled();
  });

  it('stores an own replay as private when the mod names no visibility', async () => {
    devices.authenticate.mockResolvedValueOnce(boundDevice(recorderId));
    prisma.replay.findUnique.mockResolvedValueOnce(null);
    prisma.replay.create.mockClear();
    prisma.replay.create.mockResolvedValue(replayRow({ id: replayId, status: 'uploaded' }));

    const response = await uploadFromMod();

    expect(response.status).toBe(201);
    expect(devices.authenticate).toHaveBeenLastCalledWith(expect.objectContaining({ signedHeaders: [REPLAY_UPLOAD.visibilityHeader] }));
    expect(prisma.replay.create.mock.calls[0]?.[0].data).toMatchObject({ uploaderUserId: 'mod-user', deviceId: 'dev_bound', visibility: 'private' });
  });

  it('publishes an own replay when the mod asks for public', async () => {
    devices.authenticate.mockResolvedValueOnce(boundDevice(recorderId));
    prisma.replay.findUnique.mockResolvedValueOnce(null);
    prisma.replay.create.mockClear();
    prisma.replay.create.mockResolvedValue(replayRow({ id: replayId, status: 'uploaded' }));

    const response = await uploadFromMod('public');

    expect(response.status).toBe(201);
    expect(prisma.replay.create.mock.calls[0]?.[0].data).toMatchObject({ visibility: 'public' });
  });

  it('refuses a replay recorded by another account before storing it', async () => {
    devices.authenticate.mockResolvedValueOnce(boundDevice(recorderId + 1n));
    prisma.replay.findUnique.mockClear();
    prisma.replay.create.mockClear();

    const response = await uploadFromMod('public');

    expect(response.status).toBe(422);
    expect(response.body).toMatchObject({ error: 'replay_not_owned' });
    expect(prisma.replay.findUnique).not.toHaveBeenCalled();
    expect(prisma.replay.create).not.toHaveBeenCalled();
  });

  it('refuses a visibility the mod cannot choose', async () => {
    devices.authenticate.mockResolvedValueOnce(boundDevice(recorderId));
    prisma.replay.create.mockClear();

    const response = await uploadFromMod('unlisted');

    expect(response.status).toBe(400);
    expect(prisma.replay.create).not.toHaveBeenCalled();
  });

  it('tells the mod the server time on an error so it can re-sign', async () => {
    devices.authenticate.mockRejectedValueOnce(new ModException({ status: 428, error: 'stale_request' }));

    const response = await uploadFromMod();

    expect(response.status).toBe(428);
    expect(Number(response.headers['x-otmetki-server-time'])).toBeCloseTo(Date.now() / 1000, -1);
  });
});
