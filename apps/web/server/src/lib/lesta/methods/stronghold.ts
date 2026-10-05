import type { LestaRequester } from '../client/client.types';

import { passthrough, passthroughById } from './call-shapes/call-shapes';

export const createStrongholdMethods = (requester: LestaRequester) => ({
  claninfo: passthroughById({ requester, method: 'stronghold/claninfo', idParam: 'clan_id' }),
  clanreserves: passthrough({ requester, method: 'stronghold/clanreserves' }),
  activateclanreserve: passthrough({ requester, method: 'stronghold/activateclanreserve' })
});
