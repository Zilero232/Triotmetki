import type { LestaRequester } from '../client/client.types';
import type { RatingAccount, RatingDates, RatingTypes } from '../schemas/ratings/ratings.types';
import type { RatingAccountsInput, RatingDatesInput, RatingListInput, RatingNeighborsInput } from './methods.types';

import { callParams } from '../client/params/params';
import { idMapOf } from '../schemas/common/common.schemas';
import { ratingAccountSchema, ratingDatesSchema, ratingListSchema, ratingTypesSchema } from '../schemas/ratings/ratings.schemas';
import { batchedMap, genericParams, passthrough } from './call-shapes/call-shapes';

export const createRatingsMethods = (requester: LestaRequester) => {
  const accounts = async ({ type, accountIds, date, ...input }: RatingAccountsInput): Promise<Record<string, RatingAccount | null>> =>
    batchedMap({
      requester,
      method: 'ratings/accounts',
      idParam: 'account_id',
      ids: accountIds,
      params: { ...genericParams(input), type, date },
      schema: idMapOf(ratingAccountSchema.nullable().catch(null))
    });

  const typeList = async (options: RatingDatesInput = {}): Promise<RatingTypes> => {
    const { data } = await requester.call({ method: 'ratings/types', params: callParams(options), schema: ratingTypesSchema });

    return data;
  };

  const dateList = async ({ type, accountId, ...options }: RatingDatesInput = {}): Promise<RatingDates> => {
    const { data } = await requester.call({
      method: 'ratings/dates',
      params: { ...callParams(options), type, account_id: accountId },
      schema: ratingDatesSchema
    });

    return data;
  };

  const topList = async ({ type, rankField, limit, pageNo, date, ...options }: RatingListInput): Promise<RatingAccount[]> => {
    const { data } = await requester.call({
      method: 'ratings/top',
      params: { ...callParams(options), type, rank_field: rankField, limit, page_no: pageNo, date },
      schema: ratingListSchema
    });

    return data;
  };

  const neighborList = async ({ type, rankField, accountId, limit, date, ...options }: RatingNeighborsInput): Promise<RatingAccount[]> => {
    const { data } = await requester.call({
      method: 'ratings/neighbors',
      params: { ...callParams(options), type, rank_field: rankField, account_id: accountId, limit, date },
      schema: ratingListSchema
    });

    return data;
  };

  return {
    types: passthrough({ requester, method: 'ratings/types' }),
    dates: passthrough({ requester, method: 'ratings/dates' }),
    accounts,
    neighbors: passthrough({ requester, method: 'ratings/neighbors' }),
    top: passthrough({ requester, method: 'ratings/top' }),
    typeList,
    dateList,
    topList,
    neighborList
  };
};
