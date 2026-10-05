import type { INestApplication } from '@nestjs/common';

import { Test } from '@nestjs/testing';
import { AuthModule as BetterAuthModule } from '@thallesp/nestjs-better-auth';
import RedisMock from 'ioredis-mock';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { PrismaClient } from '../../../../generated';
import type { LestaClient } from '../../lesta';
import type { AccountPurgeStore, AuthEnv } from '../auth.types';
import type { LestaAccountStore } from '../lesta-id/lesta-id.types';
import type { TelegramAccountStore } from '../telegram-login/telegram-login.types';

import { createAuth } from '../auth';
import { AUTH_RATE_LIMIT } from '../auth.constants';

const WEB_URL = 'http://localhost:3000';

const UNCONFIGURED: AuthEnv = {
  API_URL: 'http://localhost:4000',
  BETTER_AUTH_SECRET: 'test-secret-not-used-outside-tests-000',
  CORS_ORIGINS: '',
  DISCORD_APPLICATION_ID: '',
  DISCORD_CLIENT_SECRET: '',
  LESTA_APPLICATION_ID: '',
  NODE_ENV: 'development',
  TELEGRAM_BOT_TOKEN: '',
  TELEGRAM_BOT_USERNAME: '',
  TRUSTED_PROXIES: '',
  VK_ID_CLIENT_ID: '',
  VK_ID_CLIENT_SECRET: '',
  VK_MINI_APP_ID: 0,
  VK_MINI_APP_SECRET: '',
  WEB_URL
};

let app: INestApplication;
let options: ReturnType<typeof createAuth>['options'];

const post = (path: string, body: object) => request(app.getHttpServer()).post(path).set('origin', WEB_URL).send(body);

beforeAll(async () => {
  const auth = createAuth({
    env: UNCONFIGURED,
    prisma: mockDeep<PrismaClient>(),
    redis: new RedisMock(),
    lesta: mock<LestaClient>(),
    lestaStore: mock<LestaAccountStore>(),
    telegramStore: mock<TelegramAccountStore>(),
    accountPurge: mock<AccountPurgeStore>(),
    logger: { log: () => undefined }
  });

  options = auth.options;

  const moduleRef = await Test.createTestingModule({
    imports: [BetterAuthModule.forRoot({ auth, disableTrustedOriginsCors: true })]
  }).compile();

  app = moduleRef.createNestApplication({ bodyParser: false });
  await app.init();
});

afterAll(async () => {
  await app.close();
});

describe('auth with every integration unconfigured', () => {
  it('encrypts the OAuth tokens it stores for linked social accounts', () => {
    expect(options.account?.encryptOAuthTokens).toBe(true);
  });

  it('reports the Telegram widget disabled instead of failing', async () => {
    const response = await request(app.getHttpServer()).get('/auth/telegram/widget');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ botUsername: null, enabled: false });
  });

  it('keeps answering the widget config past the sign-in rate limit', async () => {
    const responses = await Promise.all(
      Array.from({ length: AUTH_RATE_LIMIT.signIn.max + 1 }, async () => request(app.getHttpServer()).get('/auth/telegram/widget'))
    );

    expect(responses.map((response) => response.status)).not.toContain(429);
  });

  it.each([
    { path: '/auth/telegram/callback', body: { id: '42', auth_date: '1', hash: 'x' } },
    { path: '/auth/telegram/webapp', body: { initData: 'user=%7B%7D&hash=x' } },
    { path: '/auth/vk/mini-app', body: { launchParams: 'vk_user_id=1&sign=x' } }
  ])('answers integration-unavailable on $path', async ({ path, body }) => {
    const response = await post(path, body);

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'INTEGRATION_UNAVAILABLE' });
  });

  it.each(['discord', 'vk'])('refuses the %s social sign-in with not found', async (provider) => {
    const response = await post('/auth/sign-in/social', { provider, callbackURL: WEB_URL });

    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ code: 'PROVIDER_NOT_FOUND' });
  });

  it('redirects the Lesta ID start back to the site with an error', async () => {
    const response = await request(app.getHttpServer()).get('/auth/lesta/start');

    expect(response.status).toBe(302);
    expect(response.headers.location).toMatch(new RegExp(`^${WEB_URL}`, 'u'));
  });
});
