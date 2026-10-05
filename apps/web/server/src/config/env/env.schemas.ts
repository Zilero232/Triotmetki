import { z } from 'zod';

import { envList } from '../env-list';
import { LESTA } from '../lesta.constants';

const ipAddress = z.union([z.ipv4(), z.ipv6()]);

export const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),

  DATABASE_URL: z.url(),
  DATABASE_POOL_MAX: z.coerce.number().int().positive().optional(),
  REDIS_URL: z.url(),

  API_URL: z.url(),
  WEB_URL: z.url(),
  CORS_ORIGINS: z.string().default(''),
  TRUSTED_PROXIES: z.string().default(''),

  BETTER_AUTH_SECRET: z.string().min(32),
  INTERNAL_API_TOKEN: z.string().min(32),
  TOKEN_ENCRYPTION_SECRET: z.string().min(32),

  LESTA_APPLICATION_ID: z.string().default(''),
  LESTA_RPS: z.coerce.number().int().positive().default(20),
  LESTA_EGRESS_IPS: z.string().default('').transform(envList).pipe(z.array(ipAddress).max(LESTA.egress.maxIps)),
  LESTA_EGRESS_IP: z.union([ipAddress, z.literal('')]).default(''),

  TELEGRAM_BOT_TOKEN: z.string().default(''),
  TELEGRAM_BOT_USERNAME: z.string().default(''),
  TELEGRAM_WEBHOOK_URL: z.union([z.url(), z.literal('')]).default(''),
  TELEGRAM_WEBHOOK_SECRET: z.string().default(''),

  DISCORD_BOT_TOKEN: z.string().default(''),
  DISCORD_APPLICATION_ID: z.string().default(''),
  DISCORD_CLIENT_SECRET: z.string().default(''),

  VK_BOT_TOKEN: z.string().default(''),
  VK_GROUP_ID: z.coerce.number().int().nonnegative().default(0),
  VK_CALLBACK_CONFIRMATION: z.string().default(''),
  VK_CALLBACK_SECRET: z.string().default(''),
  VK_MINI_APP_ID: z.coerce.number().int().nonnegative().default(0),
  VK_MINI_APP_SECRET: z.string().default(''),
  VK_ID_CLIENT_ID: z.string().default(''),
  VK_ID_CLIENT_SECRET: z.string().default(''),

  VAPID_PUBLIC_KEY: z.string().default(''),
  VAPID_PRIVATE_KEY: z.string().default(''),
  VAPID_SUBJECT: z.string().default(''),

  SMTP_HOST: z.string().default(''),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_SECURE: z.stringbool().default(false),
  SMTP_USER: z.string().default(''),
  SMTP_PASSWORD: z.string().default(''),
  EMAIL_FROM: z.string().default(''),

  YOOKASSA_SHOP_ID: z.string().default(''),
  YOOKASSA_SECRET_KEY: z.string().default(''),
  YOOKASSA_RECURRING: z.stringbool().default(false),

  DONATIONALERTS_CLIENT_ID: z.string().default(''),
  DONATIONALERTS_CLIENT_SECRET: z.string().default(''),

  TWITCH_CLIENT_ID: z.string().default(''),
  TWITCH_CLIENT_SECRET: z.string().default(''),
  VK_LIVE_CLIENT_ID: z.string().default(''),
  VK_LIVE_CLIENT_SECRET: z.string().default(''),
  YOUTUBE_API_KEY: z.string().default(''),

  MOD_INGEST_SECRET: z.string().min(32),

  BULL_BOARD_PASSWORD: z.string().default('')
});
