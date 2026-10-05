import type { MissingPlayerLookup } from './missing-player.types';

import { PLAYER_LOOKUP } from '../../config/player-lookup.constants';

export const missingPlayerKey = ({ kind, value }: MissingPlayerLookup): string =>
  `${PLAYER_LOOKUP.missingKeyPrefix}${kind}:${value.trim().toLowerCase()}`;
