import type { ClaimMethod } from '@otmetki/schemas';

import { invert } from 'remeda';

import type { StreamerClaimMethod } from '../../../../../generated';

export const CLAIM = {
  codePrefix: 'otmetki-',
  codeBytes: 3,
  bioPlatforms: ['twitch', 'vkVideoLive', 'youtube']
} as const;

export const CLAIM_METHOD_TO_DB = {
  oauth: 'oauth',
  bio_code: 'bioCode',
  manual: 'manual'
} as const satisfies Record<ClaimMethod, StreamerClaimMethod>;

export const CLAIM_METHOD_FROM_DB = invert(CLAIM_METHOD_TO_DB) satisfies Record<StreamerClaimMethod, ClaimMethod>;
