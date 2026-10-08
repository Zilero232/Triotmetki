import type { INestApplication } from '@nestjs/common';

import { APP_FILTER, APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { usageLimit } from '@otmetki/schemas';
import RedisMock from 'ioredis-mock';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { range } from 'remeda';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { VehicleArmorModel } from '../../../../generated';
import type { ArmorStorage } from '../../gamedata';
import type { CatalogEntry } from '../../reference';

import { AllExceptionsFilter } from '../../../common/filters';
import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { EntitlementsService } from '../../billing';
import { VehicleCatalogService } from '../../reference';
import { USAGE_DEVICE, UsageActorGuard, UsageMeterService } from '../../usage';
import { ARMOR_STORAGE } from '../config/armor.constants';
import { TankArmorReaderService } from '../services/tank-armor-reader.service';
import { TankDetailReaderService } from '../services/tank-detail-reader.service';
import { TankArmorController } from '../tank-armor.controller';

const USER_HEADER = 'x-test-user';
const ANONYMOUS_LIMIT = usageLimit({ meter: 'armor3d', audience: 'anonymous' }) ?? 0;
const FREE_LIMIT = usageLimit({ meter: 'armor3d', audience: 'free' }) ?? 0;

const ROW: VehicleArmorModel = {
  tankId: 1,
  gameVersion: '1.45.0.5231',
  storageKey: 'armor/1.bin',
  hash: 'abc',
  bytes: 3,
  modules: { hull: { piece: 'Hull', plates: [] }, chassis: [], turrets: [] },
  sourceSha: 'b'.repeat(40),
  updatedAt: new Date('2026-09-25T00:00:00Z')
};

const SUMMARY = {
  tankId: 1,
  name: 'T',
  shortName: 'T',
  slug: 't',
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null, large: null }
} as const;

const prisma = mockDeep<PrismaService>();
const catalog = mock<VehicleCatalogService>();
const details = mock<TankDetailReaderService>();
const entitlements = mock<EntitlementsService>();
const config = mock<AppConfigService>();
const storage: ArmorStorage = { put: async () => undefined, remove: async () => undefined, get: async () => new Uint8Array([1, 2, 3]) };

let app: INestApplication;

const armorOf = (tank: number, userId?: string) => {
  const call = request(app.getHttpServer()).get(`/tanks/tank-${tank}/armor`);

  return userId ? call.set(USER_HEADER, userId) : call;
};

beforeAll(async () => {
  prisma.vehicleArmorModel.findUnique.mockResolvedValue(ROW);
  catalog.find.mockResolvedValue(mock<CatalogEntry>({ summary: SUMMARY }));
  details.resolve.mockImplementation(async (idOrSlug) => Number(idOrSlug.replace('tank-', '')));
  entitlements.isPlus.mockImplementation(async (userId) => userId === 'plus-user');
  config.get.calledWith('BETTER_AUTH_SECRET').mockReturnValue('test-secret');
  config.get.calledWith('NODE_ENV').mockReturnValue('test');

  const moduleRef = await Test.createTestingModule({
    controllers: [TankArmorController],
    providers: [
      TankArmorReaderService,
      UsageMeterService,
      UsageActorGuard,
      { provide: PrismaService, useValue: prisma },
      { provide: VehicleCatalogService, useValue: catalog },
      { provide: TankDetailReaderService, useValue: details },
      { provide: EntitlementsService, useValue: entitlements },
      { provide: AppConfigService, useValue: config },
      { provide: ARMOR_STORAGE, useValue: storage },
      { provide: REDIS, useValue: new RedisMock() },
      { provide: APP_PIPE, useClass: ZodValidationPipe },
      { provide: APP_FILTER, useClass: AllExceptionsFilter },
      { provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }
    ]
  }).compile();

  app = moduleRef.createNestApplication();

  app.use((req: { headers: Record<string, string | undefined>; session?: unknown }, _res: unknown, next: () => void) => {
    const userId = req.headers[USER_HEADER];

    req.session = userId ? { user: { id: userId } } : null;
    next();
  });

  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('GET /tanks/:idOrSlug/armor', () => {
  it('hands an anonymous visitor a signed device cookie and keeps the response out of every HTTP cache', async () => {
    const response = await armorOf(1);

    expect(response.status).toBe(200);
    expect(String(response.headers['set-cookie'])).toContain(`${USAGE_DEVICE.cookie}=`);
    expect(response.headers['cache-control']).toContain('private');
    expect(response.headers['cache-control']).toContain('no-store');
  });

  it('meters an anonymous visitor through the device cookie and then asks for Plus', async () => {
    const agent = request.agent(app.getHttpServer());

    for (const tank of range(0, ANONYMOUS_LIMIT)) {
      expect((await agent.get(`/tanks/tank-${tank}/armor`)).status).toBe(200);
    }

    const refused = await agent.get('/tanks/tank-99/armor');

    expect(refused.status).toBe(403);
    expect(refused.body).toMatchObject({ code: 'SUBSCRIPTION_REQUIRED', details: { feature: 'armor3d', limit: ANONYMOUS_LIMIT } });
  });

  it('refuses a forged device cookie and issues a freshly signed one', async () => {
    const forged = `${USAGE_DEVICE.cookie}=device-x.${'0'.repeat(64)}`;

    const response = await armorOf(1).set('Cookie', forged);

    expect(String(response.headers['set-cookie'])).toContain(`${USAGE_DEVICE.cookie}=`);
    expect(String(response.headers['set-cookie'])).not.toContain('device-x');
  });

  it('meters a signed-in free user by the account', async () => {
    for (const tank of range(0, FREE_LIMIT)) {
      expect((await armorOf(tank, 'free-user')).status).toBe(200);
    }

    expect((await armorOf(FREE_LIMIT, 'free-user')).status).toBe(403);
    expect((await armorOf(0, 'free-user')).status).toBe(200);
  });

  it('never meters Plus', async () => {
    for (const tank of range(0, FREE_LIMIT + 1)) {
      expect((await armorOf(tank, 'plus-user')).status).toBe(200);
    }
  });
});

describe('GET /tanks/:idOrSlug/armor/showcase', () => {
  it('serves the model for the 3D showcase', async () => {
    const response = await request(app.getHttpServer()).get('/tanks/tank-1/armor/showcase');

    expect(response.status).toBe(200);
    expect(response.body.vehicle.slug).toBe(SUMMARY.slug);
  });

  it('never spends an armor view, however many showcases are shown', async () => {
    const agent = request.agent(app.getHttpServer());

    for (const tank of range(0, ANONYMOUS_LIMIT + 2)) {
      expect((await agent.get(`/tanks/tank-${tank}/armor/showcase`)).status).toBe(200);
    }

    expect((await agent.get('/tanks/tank-0/armor')).status).toBe(200);
  });

  it('answers 404 when the tank has no armor model', async () => {
    prisma.vehicleArmorModel.findUnique.mockResolvedValueOnce(null);

    expect((await request(app.getHttpServer()).get('/tanks/tank-404/armor/showcase')).status).toBe(404);
  });
});

describe('GET /tanks/:idOrSlug/armor/guns', () => {
  it('lists each gun of the attacker once, with its shells and without collision data', async () => {
    const shell = {
      name: 'ap',
      displayName: 'AP',
      kind: 'ARMOR_PIERCING',
      caliber: 122,
      damage: 390,
      penetration: { at100m: 225, at500m: 220 },
      isPremium: false
    };

    const gun = { name: 'D-25T', displayName: '122 mm D-25T', piece: 'Gun_01', plates: [], shells: [shell] };

    prisma.vehicleArmorModel.findUnique.mockResolvedValueOnce({
      ...ROW,
      modules: {
        hull: { piece: 'Hull', plates: [] },
        chassis: [],
        turrets: [
          { name: 't1', displayName: 'T1', piece: 'Turret_01', plates: [], guns: [gun] },
          { name: 't2', displayName: 'T2', piece: 'Turret_02', plates: [], guns: [gun] }
        ]
      }
    });

    const response = await request(app.getHttpServer()).get('/tanks/tank-1/armor/guns');

    expect(response.status).toBe(200);
    expect(response.body.guns).toEqual([{ name: gun.name, displayName: gun.displayName, shells: [shell] }]);
  });

  it('never spends an armor view, however many attackers are browsed', async () => {
    const agent = request.agent(app.getHttpServer());

    for (const tank of range(0, ANONYMOUS_LIMIT + 2)) {
      expect((await agent.get(`/tanks/tank-${tank}/armor/guns`)).status).toBe(200);
    }

    expect((await agent.get('/tanks/tank-0/armor')).status).toBe(200);
  });

  it('answers 404 when the attacker has no armor model', async () => {
    prisma.vehicleArmorModel.findUnique.mockResolvedValueOnce(null);

    expect((await request(app.getHttpServer()).get('/tanks/tank-1/armor/guns')).status).toBe(404);
  });
});
