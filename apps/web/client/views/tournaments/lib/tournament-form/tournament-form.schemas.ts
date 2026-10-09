import { isFuture } from 'date-fns';
import * as z from 'zod';

import { zCreateTournament } from '@/entities/tournament/tournament';
import { requirementsFormSchema } from '@/features/community/stat-requirements';
import { zonedInputToIso } from '@/shared/lib';

const localDate = z.string().refine((value) => value === '' || zonedInputToIso({ value }) !== undefined);

export const tournamentFormSchema = z
  .object({
    title: zCreateTournament.shape.title,
    description: zCreateTournament.shape.description.unwrap(),
    requirements: requirementsFormSchema,
    maxParticipants: z
      .string()
      .trim()
      .refine((value) => zCreateTournament.shape.maxParticipants.safeParse(Number(value)).success && value !== ''),
    registrationEndsAt: localDate,
    startsAt: localDate.refine((value) => isFuture(zonedInputToIso({ value }) ?? 0))
  })
  .refine(
    ({ registrationEndsAt, startsAt }) =>
      registrationEndsAt === '' || (zonedInputToIso({ value: registrationEndsAt }) ?? '') <= (zonedInputToIso({ value: startsAt }) ?? ''),
    {
      path: ['registrationEndsAt']
    }
  );
