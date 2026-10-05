import type { z } from 'zod';

import type { LestaId } from '../../batching/batching.types';
import type { LestaParams, LestaRequester } from '../../client/client.types';

export type PassthroughInput = {
  requester: LestaRequester;
  method: string;
};

export type PassthroughByIdInput = PassthroughInput & {
  idParam: string;
};

export type BatchedMapInput<T> = {
  requester: LestaRequester;
  method: string;
  idParam: string;
  ids: readonly LestaId[];
  params: LestaParams;
  schema: z.ZodType<Record<string, T>>;
};
