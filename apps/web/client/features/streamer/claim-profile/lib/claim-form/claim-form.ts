import * as z from 'zod';

import { CLAIM_PROFILE } from '../../config';

export const manualClaimSchema = z.object({
  evidence: z.string().trim().min(CLAIM_PROFILE.evidenceMin).max(CLAIM_PROFILE.evidenceMax)
});
