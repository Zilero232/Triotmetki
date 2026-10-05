import { z } from 'zod';

import type { FieldList, LestaRequester, Selected } from '../client/client.types';
import type { TankAchievements, TankStats } from '../schemas/tanks/tanks.types';
import type { AccountTanksStatsInput, PerAccountInput, TankMasteryInput } from './methods.types';

import { batchById, batchList } from '../batching/batching';
import { callParams, fieldAwareSchema } from '../client/params/params';
import { idMapOf } from '../schemas/common/common.schemas';
import { tankAchievementsSchema, tankMasterySchema, tankStatsSchema } from '../schemas/tanks/tanks.schemas';

export const createTanksMethods = (requester: LestaRequester) => {
  const perAccount = async <T>({ method, input, schema }: PerAccountInput<T>): Promise<T[]> => {
    const { accountId, tankIds, inGarage, fields, ...options } = input;
    const params = { ...callParams({ ...options, fields }), account_id: accountId, in_garage: inGarage === undefined ? undefined : Number(inGarage) };
    const mapSchema = idMapOf(z.array(schema));

    const fetchPart = async (part: readonly (number | string)[] | undefined): Promise<T[]> => {
      const { data } = await requester.call({ method, params: { ...params, tank_id: part }, schema: mapSchema });

      return data[String(accountId)] ?? [];
    };

    if (!tankIds || tankIds.length === 0) {
      return fetchPart(undefined);
    }

    return batchList({ items: tankIds, run: fetchPart });
  };

  const stats = async <const F extends FieldList | undefined = undefined>(input: AccountTanksStatsInput<F>): Promise<Selected<F, TankStats>[]> =>
    perAccount({ method: 'tanks/stats', input, schema: fieldAwareSchema({ schema: tankStatsSchema, fields: input.fields }) });

  const achievements = async <const F extends FieldList | undefined = undefined>(
    input: AccountTanksStatsInput<F>
  ): Promise<Selected<F, TankAchievements>[]> =>
    perAccount({
      method: 'tanks/achievements',
      input,
      schema: fieldAwareSchema({ schema: tankAchievementsSchema, fields: input.fields })
    });

  const mastery = async ({ tankIds, distribution, percentiles, ...options }: TankMasteryInput): Promise<Record<string, Record<string, number>>> =>
    batchById({
      ids: tankIds,
      run: async (part) => {
        const { data } = await requester.call({
          method: 'tanks/mastery',
          params: { ...callParams(options), tank_id: part, distribution, percentile: percentiles },
          schema: tankMasterySchema
        });

        return data.distribution ?? {};
      }
    });

  return { stats, achievements, mastery };
};
