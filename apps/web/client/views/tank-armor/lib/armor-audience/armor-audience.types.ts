import type { UsageAudience } from '@otmetki/schemas';

export type ArmorAudienceInput = {
  reported: UsageAudience | null;
  isSignedIn: boolean;
};
