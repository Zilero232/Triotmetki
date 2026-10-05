import { z } from 'zod';

import type { FieldList, LestaRequester, Selected } from '../client/client.types';
import type { AccountAchievements, AccountInfo, AccountListItem, AccountTank } from '../schemas/account/account.types';
import type { AccountIdsInput, AccountListInput, AccountTanksInput } from './methods.types';

import { batchList } from '../batching/batching';
import { callParams, fieldAwareSchema } from '../client/params/params';
import { accountAchievementsSchema, accountInfoSchema, accountListSchema, accountTankSchema } from '../schemas/account/account.schemas';
import { idMapOf } from '../schemas/common/common.schemas';
import { batchedMap } from './call-shapes/call-shapes';

export const createAccountMethods = (requester: LestaRequester) => {
  const list = async ({ search, type, limit, ...options }: AccountListInput): Promise<AccountListItem[]> => {
    const params = callParams(options);

    if (typeof search === 'string') {
      const { data } = await requester.call({
        method: 'account/list',
        params: { ...params, search, type, limit },
        schema: accountListSchema
      });

      return data;
    }

    return batchList({
      items: search,
      run: async (names) => {
        const { data } = await requester.call({
          method: 'account/list',
          params: { ...params, search: names, type: 'exact', limit },
          schema: accountListSchema
        });

        return data;
      }
    });
  };

  const info = async <const F extends FieldList | undefined = undefined>({
    accountIds,
    fields,
    ...options
  }: AccountIdsInput<F>): Promise<Record<string, Selected<F, AccountInfo> | null>> =>
    batchedMap({
      requester,
      method: 'account/info',
      idParam: 'account_id',
      ids: accountIds,
      params: callParams({ ...options, fields }),
      schema: idMapOf(fieldAwareSchema({ schema: accountInfoSchema, fields }))
    });

  const tanks = async <const F extends FieldList | undefined = undefined>({
    accountIds,
    tankIds,
    fields,
    ...options
  }: AccountTanksInput<F>): Promise<Record<string, Selected<F, AccountTank[]> | null>> =>
    batchedMap({
      requester,
      method: 'account/tanks',
      idParam: 'account_id',
      ids: accountIds,
      params: { ...callParams({ ...options, fields }), tank_id: tankIds },
      schema: idMapOf(fieldAwareSchema({ schema: z.array(accountTankSchema), fields }))
    });

  const achievements = async <const F extends FieldList | undefined = undefined>({
    accountIds,
    fields,
    ...options
  }: AccountIdsInput<F>): Promise<Record<string, Selected<F, AccountAchievements> | null>> =>
    batchedMap({
      requester,
      method: 'account/achievements',
      idParam: 'account_id',
      ids: accountIds,
      params: callParams({ ...options, fields }),
      schema: idMapOf(fieldAwareSchema({ schema: accountAchievementsSchema, fields }))
    });

  return { list, info, tanks, achievements };
};
