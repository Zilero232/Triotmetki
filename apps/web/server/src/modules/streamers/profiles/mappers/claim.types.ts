import type { StreamerClaim } from '../../../../../generated';

export type ToClaimViewInput = {
  claim: StreamerClaim;
  slug: string;
};

export type PendingClaimRow = StreamerClaim & {
  profile: { slug: string } | null;
  invitation: { slug: string } | null;
};
