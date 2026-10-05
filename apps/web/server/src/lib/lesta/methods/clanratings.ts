import type { LestaRequester } from '../client/client.types';
import type { ClanRatingClansInput } from './methods.types';

import { looseMapSchema } from '../schemas/common/common.schemas';
import { batchedMap, genericParams, passthrough } from './call-shapes/call-shapes';

export const createClanratingsMethods = (requester: LestaRequester) => {
  const clans = async ({ clanIds, date, ...input }: ClanRatingClansInput): Promise<Record<string, unknown>> =>
    batchedMap({
      requester,
      method: 'clanratings/clans',
      idParam: 'clan_id',
      ids: clanIds,
      params: { ...genericParams(input), date },
      schema: looseMapSchema
    });

  return {
    types: passthrough({ requester, method: 'clanratings/types' }),
    dates: passthrough({ requester, method: 'clanratings/dates' }),
    clans,
    neighbors: passthrough({ requester, method: 'clanratings/neighbors' }),
    top: passthrough({ requester, method: 'clanratings/top' })
  };
};
