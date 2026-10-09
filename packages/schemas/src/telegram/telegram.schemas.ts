import * as z from 'zod';

import { isoDateTimeSchema } from '../common/primitives/primitives.schemas';
import { TELEGRAM_WEB_LOGIN } from './telegram.constants';

export const telegramStatusSchema = z.object({
  isLinked: z.boolean(),
  username: z.string().nullable(),
  botUsername: z.string().nullable()
});

export const telegramLinkCodeSchema = z.object({
  code: z.string(),
  expiresAt: isoDateTimeSchema,
  deepLink: z.url().nullable()
});

export const telegramWebLoginSchema = z.object({
  code: z.string().min(TELEGRAM_WEB_LOGIN.minCodeLength).max(TELEGRAM_WEB_LOGIN.maxCodeLength)
});

export const telegramSessionTokenSchema = z.object({
  token: z.string()
});
