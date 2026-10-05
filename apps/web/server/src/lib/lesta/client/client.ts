import type { LestaClientOptions } from './client.types';

import { createAccountMethods } from '../methods/account';
import { createAuthMethods } from '../methods/auth';
import { createClanratingsMethods } from '../methods/clanratings';
import { createClansMethods } from '../methods/clans';
import { createEncyclopediaMethods } from '../methods/encyclopedia';
import { createGlobalmapMethods } from '../methods/globalmap';
import { createRatingsMethods } from '../methods/ratings';
import { createStrongholdMethods } from '../methods/stronghold';
import { createTanksMethods } from '../methods/tanks';
import { createWgnMethods } from '../methods/wgn';
import { createRequester } from './requester';

export const createLestaClient = (options: LestaClientOptions) => {
  const requester = createRequester(options);

  return {
    request: requester.call,
    account: createAccountMethods(requester),
    auth: createAuthMethods(requester),
    tanks: createTanksMethods(requester),
    encyclopedia: createEncyclopediaMethods(requester),
    clans: createClansMethods(requester),
    globalmap: createGlobalmapMethods(requester),
    stronghold: createStrongholdMethods(requester),
    ratings: createRatingsMethods(requester),
    clanratings: createClanratingsMethods(requester),
    wgn: createWgnMethods(requester)
  };
};

export type LestaClient = ReturnType<typeof createLestaClient>;
