import * as z from 'zod';

import { zUpsertCoach } from '@/entities/coaching/coach';

import { COACH_FORM } from '../../config';

const httpsLink = z.union([z.literal(''), z.url({ protocol: COACH_FORM.linkProtocol })]);

export const coachFormSchema = z.object({
  accountId: z.string().min(1),
  headline: zUpsertCoach.shape.headline,
  bio: zUpsertCoach.shape.bio.unwrap(),
  contacts: z.object({
    telegram: httpsLink,
    vk: httpsLink,
    booking: httpsLink,
    discord: z.union([z.literal(''), z.string().trim().min(COACH_FORM.discordMin).max(COACH_FORM.contactMax)])
  }),
  tankIds: z.array(z.number().int().positive()).max(COACH_FORM.maxTanks),
  isActive: z.boolean()
});
