import type { AdminClaim, StreamerClaim as StreamerClaimView } from '@otmetki/schemas';

import type { PendingClaimRow, ToClaimViewInput } from './claim.types';

import { toIso } from '../../../../common/lib';
import { CLAIM_METHOD_FROM_DB } from '../config/claims.constants';

export const toClaimView = ({ claim, slug }: ToClaimViewInput): StreamerClaimView => ({
  id: claim.id,
  slug,
  method: CLAIM_METHOD_FROM_DB[claim.method],
  status: claim.status,
  code: claim.code,
  createdAt: claim.createdAt.toISOString(),
  resolvedAt: toIso(claim.resolvedAt)
});

export const toAdminClaim = (claim: PendingClaimRow): AdminClaim => ({
  ...toClaimView({ claim, slug: claim.profile?.slug ?? claim.invitation?.slug ?? '' }),
  userId: claim.userId,
  evidence: claim.evidence
});
