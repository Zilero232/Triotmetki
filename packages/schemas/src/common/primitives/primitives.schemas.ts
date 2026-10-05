import { z } from 'zod';

export const accountIdSchema = z.coerce.number().int().positive();
export const clanIdSchema = z.coerce.number().int().positive();
export const tankIdSchema = z.coerce.number().int().positive();
export const uuidSchema = z.uuid();

export const nicknameSchema = z.string().trim().min(2).max(24).regex(/^\w+$/);

export const isoDateTimeSchema = z.iso.datetime({ offset: true });
export const isoDateSchema = z.iso.date();

export const ratioSchema = z.number().min(0).max(1).describe('Fraction, 0–1');
export const percentSchema = z.number().min(0).max(100).describe('Percent, 0–100');
export const percentDeltaSchema = z.number().min(-100).max(100).describe('Percentage points, −100…100');
export const countSchema = z.number().int().nonnegative();

export const httpUrlSchema = z.url({ protocol: /^https?$/, hostname: z.regexes.domain }).max(2048);
export const httpsUrlSchema = z.url({ protocol: /^https$/, hostname: z.regexes.domain }).max(2048);
