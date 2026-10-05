import type { INestApplication } from '@nestjs/common';

import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { MODPACK_RELEASES, modpackChangelogSchema } from '@otmetki/schemas';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AllExceptionsFilter } from '../../../common/filters';
import { INDEX } from '../lib/release-index/_tests/fixtures';
import { ModpackReleasesController } from '../modpack-releases.controller';
import { DownloadFilesReaderService } from '../services/download-files-reader.service';
import { ModpackReleasesReaderService } from '../services/modpack-releases-reader.service';
import { ReleaseIndexReaderService } from '../services/release-index-reader.service';

describe('modpack releases API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ModpackReleasesController],
      providers: [
        ModpackReleasesReaderService,
        { provide: ReleaseIndexReaderService, useValue: { load: async () => INDEX } },
        { provide: DownloadFilesReaderService, useValue: { sizes: async () => ({ modpack: 2_048, manager: null }) } },
        { provide: APP_FILTER, useClass: AllExceptionsFilter },
        { provide: APP_PIPE, useClass: ZodValidationPipe },
        { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }
      ]
    }).compile();

    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('answers GET /modpack/releases/latest with the compatible release and its package hashes', async () => {
    const response = await request(app.getHttpServer()).get('/modpack/releases/latest').query({ game: '1.46.0.0' });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('compatible');
    expect(response.body.release.version).toBe('0.10.0');
    expect(response.body.release.packages[0].sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(response.body.release.signature).toBe('c2lnbmF0dXJl');
  });

  it('tells the manager to wait for a client no release supports', async () => {
    const response = await request(app.getHttpServer()).get('/modpack/releases/latest').query({ game: '1.99.0.0' });

    expect(response.body).toEqual({ game: '1.99.0.0', status: 'waiting', release: null });
  });

  it('rejects a malformed game version before the service', async () => {
    const response = await request(app.getHttpServer()).get('/modpack/releases/latest').query({ game: 'latest' });

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });

  it('answers GET /modpack/releases/status with what the downloads folder really holds', async () => {
    const response = await request(app.getHttpServer()).get('/modpack/releases/status');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ modpack: { version: '0.10.0', publishedAt: '2026-09-27T12:00:00.000Z', size: 2_048 }, manager: null });
  });

  it('serves the Tauri updater payload for an older manager', async () => {
    const response = await request(app.getHttpServer()).get('/modpack/manager/update').query({ target: 'windows', arch: 'x86_64', current: '0.1.0' });

    expect(response.status).toBe(200);
    expect(response.body.version).toBe('0.2.0');
    expect(response.body.signature).toBeTruthy();
  });

  it('answers 204 when the manager is current', async () => {
    const response = await request(app.getHttpServer()).get('/modpack/manager/update').query({ target: 'windows', arch: 'x86_64', current: '0.2.0' });

    expect(response.status).toBe(204);
    expect(response.text).toBe('');
  });

  it('answers GET /modpack/releases/changelog newest first with the packages each release changed', async () => {
    const response = await request(app.getHttpServer()).get('/modpack/releases/changelog');
    const { releases } = modpackChangelogSchema.parse(response.body);

    expect(response.status).toBe(200);
    expect(releases.map((item) => item.version)).toEqual(['0.10.0', '0.2.0', '0.1.0']);
    expect(releases[0]).toMatchObject({ notes: null, changes: [{ id: 'core', version: '0.10.0', notes: null }] });
  });

  it('honours the changelog limit and refuses one past the maximum', async () => {
    const limited = await request(app.getHttpServer()).get('/modpack/releases/changelog').query({ limit: 1 });
    const tooMany = await request(app.getHttpServer())
      .get('/modpack/releases/changelog')
      .query({ limit: MODPACK_RELEASES.changelogMaxLimit + 1 });

    expect(limited.body.releases).toHaveLength(1);
    expect(tooMany.status).toBe(400);
  });
});
