import { COMPETITION_MODES, COMPETITION_VISIBILITIES, competitionScoringSchema, createCompetitionSchema } from '@otmetki/schemas';
import * as z from 'zod';

import { zonedInputToIso } from '@/shared/lib';

import { toCreateCompetitionInput } from './competition-form';

const localDate = z.string().refine((value) => zonedInputToIso({ value }) !== undefined);

export const competitionFormFieldsSchema = z.object({
  title: z.string(),
  description: z.string(),
  visibility: z.enum(COMPETITION_VISIBILITIES),
  mode: z.enum(COMPETITION_MODES),
  battlesPerPlayer: z.number(),
  minTier: z.string(),
  startsAt: localDate,
  endsAt: localDate,
  scoring: competitionScoringSchema
});

export const competitionFormSchema = competitionFormFieldsSchema.transform(toCreateCompetitionInput).pipe(createCompetitionSchema);
