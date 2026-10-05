import { z } from 'zod';

import type { IdListInput, LestaGenericInput } from '../methods.types';
import type { BatchedMapInput, PassthroughByIdInput, PassthroughInput } from './call-shapes.types';

import { batchById } from '../../batching/batching';
import { callParams } from '../../client/params/params';
import { looseMapSchema } from '../../schemas/common/common.schemas';

export const genericParams = ({ params, ...options }: LestaGenericInput) => ({ ...callParams(options), ...params });

export const passthrough =
  ({ requester, method }: PassthroughInput) =>
  async (input: LestaGenericInput = {}): Promise<unknown> => {
    const { data } = await requester.call({ method, params: genericParams(input), schema: z.unknown() });

    return data;
  };

export const batchedMap = async <T>({ requester, method, idParam, ids, params, schema }: BatchedMapInput<T>) =>
  batchById({
    ids,
    run: async (chunk) => {
      const { data } = await requester.call({ method, params: { ...params, [idParam]: chunk }, schema });

      return data;
    }
  });

export const passthroughById =
  ({ requester, method, idParam }: PassthroughByIdInput) =>
  async ({ ids, ...input }: IdListInput = {}): Promise<Record<string, unknown>> => {
    if (!ids) {
      const { data } = await requester.call({ method, params: genericParams(input), schema: looseMapSchema });

      return data;
    }

    return batchedMap({ requester, method, idParam, ids, params: genericParams(input), schema: looseMapSchema });
  };
