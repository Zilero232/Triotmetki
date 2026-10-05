import type { createChallengeSchema } from '@otmetki/schemas';
import type { z } from 'zod';

export type ChallengeFormValues = z.input<typeof createChallengeSchema>;

export type ChallengeFormOutput = z.output<typeof createChallengeSchema>;
