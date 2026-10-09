import * as z from 'zod';

import { zRegisterTournament } from '@/entities/tournament/tournament';

export const registrationFormSchema = z.object({
  accountId: z.string(),
  teamName: z.string().refine((value) => value.trim() === '' || zRegisterTournament.shape.teamName.safeParse(value.trim()).success)
});
