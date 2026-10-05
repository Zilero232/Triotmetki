import type { LestaRequester } from '../client/client.types';

import { passthrough, passthroughById } from './call-shapes/call-shapes';

export const createGlobalmapMethods = (requester: LestaRequester) => ({
  fronts: passthrough({ requester, method: 'globalmap/fronts' }),
  provinces: passthrough({ requester, method: 'globalmap/provinces' }),
  claninfo: passthroughById({ requester, method: 'globalmap/claninfo', idParam: 'clan_id' }),
  clanprovinces: passthroughById({ requester, method: 'globalmap/clanprovinces', idParam: 'clan_id' }),
  clanbattles: passthrough({ requester, method: 'globalmap/clanbattles' }),
  seasons: passthrough({ requester, method: 'globalmap/seasons' }),
  seasonclaninfo: passthroughById({ requester, method: 'globalmap/seasonclaninfo', idParam: 'clan_id' }),
  seasonaccountinfo: passthrough({ requester, method: 'globalmap/seasonaccountinfo' }),
  seasonrating: passthrough({ requester, method: 'globalmap/seasonrating' }),
  seasonratingneighbors: passthrough({ requester, method: 'globalmap/seasonratingneighbors' }),
  events: passthrough({ requester, method: 'globalmap/events' }),
  eventclaninfo: passthroughById({ requester, method: 'globalmap/eventclaninfo', idParam: 'clan_id' }),
  eventaccountinfo: passthrough({ requester, method: 'globalmap/eventaccountinfo' }),
  eventaccountratings: passthrough({ requester, method: 'globalmap/eventaccountratings' }),
  eventaccountratingneighbors: passthrough({ requester, method: 'globalmap/eventaccountratingneighbors' }),
  eventrating: passthrough({ requester, method: 'globalmap/eventrating' }),
  eventratingneighbors: passthrough({ requester, method: 'globalmap/eventratingneighbors' }),
  info: passthrough({ requester, method: 'globalmap/info' })
});
