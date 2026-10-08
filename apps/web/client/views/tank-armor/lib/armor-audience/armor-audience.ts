import type { UsageAudience } from '@otmetki/schemas';

import type { ArmorAudienceInput } from './armor-audience.types';

export const armorAudience = ({ reported, isSignedIn }: ArmorAudienceInput): UsageAudience => {
  if (reported) {
    return reported;
  }

  return isSignedIn ? 'free' : 'anonymous';
};
