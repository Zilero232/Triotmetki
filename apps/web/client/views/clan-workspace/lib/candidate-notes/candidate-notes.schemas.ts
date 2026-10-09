import * as z from 'zod';

import { CANDIDATE_NOTES } from '../../config';

export const candidateNotesSchema = z
  .object({ notes: z.string().trim().max(CANDIDATE_NOTES.maxLength) })
  .transform(({ notes }) => ({ notes: notes === '' ? null : notes }));
