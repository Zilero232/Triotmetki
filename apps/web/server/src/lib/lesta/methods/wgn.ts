import type { LestaCallOptions, LestaRequester } from '../client/client.types';
import type { ServerOnline } from '../schemas/wgn/wgn.types';

import { LESTA_API } from '../client/client.constants';
import { callParams } from '../client/params/params';
import { serversInfoSchema } from '../schemas/wgn/wgn.schemas';

export const createWgnMethods = (requester: LestaRequester) => {
  const servers = async (options: LestaCallOptions = {}): Promise<ServerOnline[]> => {
    const { data } = await requester.call({
      method: `${LESTA_API.wgnPath}servers/info`,
      params: { ...callParams(options), game: LESTA_API.game },
      schema: serversInfoSchema
    });

    return data[LESTA_API.game] ?? [];
  };

  return { servers };
};
