import { COMPETITION } from '@otmetki/schemas';
import * as z from 'zod';

import { JOIN_FORM } from '../../config/competition-page.constants';

export const joinFormSchema = z
  .object({
    accountId: z.string(),
    teamId: z.string().min(1),
    teamName: z.string()
  })
  .refine(
    ({ teamId, teamName }) => teamId !== JOIN_FORM.newTeam || z.string().trim().min(2).max(COMPETITION.teamNameMax).safeParse(teamName).success,
    {
      path: ['teamName']
    }
  );
