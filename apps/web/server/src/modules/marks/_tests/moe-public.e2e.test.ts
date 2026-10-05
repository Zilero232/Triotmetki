import type { INestApplication } from '@nestjs/common';

import { CacheModule } from '@nestjs/cache-manager';
import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

import { AllExceptionsFilter } from '../../../common/filters';
import { MoePublicController } from '../moe-public.controller';
import { ModThresholdsReaderService } from '../services/mod-thresholds-reader.service';

const KNOWN_TANK = 17_953;
const thresholds = { '65': 2_000, '85': 2_600, '95': 3_100 };
const mastery = { class3: 540, class2: 710, class1: 960, ace: 1_320 };
const curve = [{ percent: 70, damage: 2_200, players: 6, battles: 40 }];

const service = {
  forTank: async (tankId: number) => {
    if (tankId !== KNOWN_TANK) {
      return { tank_id: tankId, is_enough: false, thresholds: {}, curve: [], updated_at: null, source: null };
    }

    return { tank_id: tankId, is_enough: true, thresholds, curve, mastery, updated_at: '2026-09-24T00:00:00.000Z', source: 'otmetki' };
  }
};

describe('GET /v1/moe/:tankId', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [CacheModule.register()],
      controllers: [MoePublicController],
      providers: [
        { provide: ModThresholdsReaderService, useValue: service },
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

  it('returns the thresholds in the shape the mod reads', async () => {
    const response = await request(app.getHttpServer()).get(`/v1/moe/${KNOWN_TANK}`);

    expect(response.status).toBe(200);
    expect(response.body.tank_id).toBe(KNOWN_TANK);
    expect(response.body.is_enough).toBe(true);
    expect(response.body.thresholds).toEqual(thresholds);
    expect(response.body.curve).toEqual(curve);
  });

  it('adds the base XP per battle of each mastery badge', async () => {
    const response = await request(app.getHttpServer()).get(`/v1/moe/${KNOWN_TANK}`);

    expect(response.body.mastery).toEqual(mastery);
  });

  it('answers 200 with is_enough false instead of an error when the thresholds are unknown', async () => {
    const response = await request(app.getHttpServer()).get('/v1/moe/1');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ tank_id: 1, is_enough: false, thresholds: {}, curve: [], updated_at: null, source: null });
  });

  it('rejects a malformed tank id before reaching the service', async () => {
    const response = await request(app.getHttpServer()).get('/v1/moe/not-a-tank');

    expect(response.status).toBe(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
  });
});
