import { z } from 'zod';

import type { FieldList, LestaRequester, Selected } from '../client/client.types';
import type { ClanAccountInfo, ClanInfo, ClanListItem, ClanMemberHistoryEntry } from '../schemas/clans/clans.types';
import type { AccountIdsInput, ClanIdsInput, ClanListInput } from './methods.types';

import { callParams, fieldAwareSchema } from '../client/params/params';
import { clanAccountInfoSchema, clanInfoSchema, clanListItemSchema, clanMemberHistoryEntrySchema } from '../schemas/clans/clans.schemas';
import { idMapOf } from '../schemas/common/common.schemas';
import { batchedMap, genericParams, passthrough } from './call-shapes/call-shapes';

export const createClansMethods = (requester: LestaRequester) => {
  const list = async ({ search, limit, pageNo, ...input }: ClanListInput = {}): Promise<ClanListItem[]> => {
    const { data } = await requester.call({
      method: 'clans/list',
      params: { ...genericParams(input), search, limit, page_no: pageNo },
      schema: z.array(clanListItemSchema)
    });

    return data;
  };

  const info = async <const F extends FieldList | undefined = undefined>({
    clanIds,
    membersKey,
    fields,
    ...options
  }: ClanIdsInput<F>): Promise<Record<string, Selected<F, ClanInfo> | null>> =>
    batchedMap({
      requester,
      method: 'clans/info',
      idParam: 'clan_id',
      ids: clanIds,
      params: { ...callParams({ ...options, fields }), members_key: membersKey },
      schema: idMapOf(fieldAwareSchema({ schema: clanInfoSchema, fields }))
    });

  const accountinfo = async <const F extends FieldList | undefined = undefined>({
    accountIds,
    fields,
    ...options
  }: AccountIdsInput<F>): Promise<Record<string, Selected<F, ClanAccountInfo> | null>> =>
    batchedMap({
      requester,
      method: 'clans/accountinfo',
      idParam: 'account_id',
      ids: accountIds,
      params: callParams({ ...options, fields }),
      schema: idMapOf(fieldAwareSchema({ schema: clanAccountInfoSchema, fields }))
    });

  const memberhistory = async <const F extends FieldList | undefined = undefined>({
    accountIds,
    fields,
    ...options
  }: AccountIdsInput<F>): Promise<Record<string, Selected<F, ClanMemberHistoryEntry[]> | null>> =>
    batchedMap({
      requester,
      method: 'clans/memberhistory',
      idParam: 'account_id',
      ids: accountIds,
      params: callParams({ ...options, fields }),
      schema: idMapOf(fieldAwareSchema({ schema: z.array(clanMemberHistoryEntrySchema), fields }))
    });

  return {
    list,
    info,
    accountinfo,
    memberhistory,
    glossary: passthrough({ requester, method: 'clans/glossary' }),
    messageboard: passthrough({ requester, method: 'clans/messageboard' })
  };
};
