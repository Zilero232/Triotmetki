import * as z from 'zod';

import { zonedInputToIso } from '@/shared/lib';

import { zCreatePlatoon } from '../../api';
import { PLATOON_FORM, PLATOON_TIERS } from '../../config';

const optionalWn8 = z
  .string()
  .trim()
  .refine((value) => value === '' || (Number.isInteger(Number(value)) && Number(value) >= 0 && Number(value) <= PLATOON_FORM.maxWn8));

export const platoonFormSchema = z
  .object({
    accountId: z.string(),
    tiers: z.array(z.enum(PLATOON_TIERS)),
    modes: z.array(z.string()),
    tankIds: z.array(z.number().int().positive()),
    hasVoice: z.boolean(),
    minWn8: optionalWn8,
    message: zCreatePlatoon.shape.message.unwrap(),
    availableFrom: z.string(),
    availableUntil: z.string(),
    expiresInHours: z.string()
  })
  .refine(
    ({ availableFrom, availableUntil }) => {
      const from = zonedInputToIso({ value: availableFrom });
      const until = zonedInputToIso({ value: availableUntil });

      return !from || !until || from < until;
    },
    { path: ['availableUntil'] }
  );
