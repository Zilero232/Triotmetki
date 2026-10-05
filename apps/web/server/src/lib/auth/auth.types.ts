import type { LoggerService } from '@nestjs/common';
import type { Redis } from 'ioredis';

import type { PrismaClient } from '../../../generated';
import type { Env } from '../../config/env/env.types';
import type { LestaClient } from '../lesta';
import type { createAuth } from './auth';
import type { LestaAccountStore } from './lesta-id/lesta-id.types';
import type { TelegramAccountStore } from './telegram-login/telegram-login.types';

export type PlaceholderEmailInput = {
  provider: string;
  id: bigint | number | string;
};

export type AccountPurgeStore = {
  purgeAccount: (input: { userId: string }) => Promise<void>;
};

export type AuthEnv = Pick<
  Env,
  | 'API_URL'
  | 'BETTER_AUTH_SECRET'
  | 'CORS_ORIGINS'
  | 'DISCORD_APPLICATION_ID'
  | 'DISCORD_CLIENT_SECRET'
  | 'LESTA_APPLICATION_ID'
  | 'NODE_ENV'
  | 'TELEGRAM_BOT_TOKEN'
  | 'TELEGRAM_BOT_USERNAME'
  | 'TRUSTED_PROXIES'
  | 'VK_ID_CLIENT_ID'
  | 'VK_ID_CLIENT_SECRET'
  | 'VK_MINI_APP_ID'
  | 'VK_MINI_APP_SECRET'
  | 'WEB_URL'
>;

export type CreateAuthInput = {
  env: AuthEnv;
  prisma: PrismaClient;
  redis: Pick<Redis, 'multi'>;
  lesta: LestaClient;
  lestaStore: LestaAccountStore;
  telegramStore: TelegramAccountStore;
  accountPurge: AccountPurgeStore;
  logger: Pick<LoggerService, 'log'>;
};

export type OtmetkiAuth = ReturnType<typeof createAuth>;
