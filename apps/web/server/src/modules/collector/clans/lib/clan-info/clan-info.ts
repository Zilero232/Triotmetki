import { fromUnixTime } from 'date-fns';

import type { Prisma } from '../../../../../../generated';
import type { ClanInfo } from '../../../../../lib/lesta';

import { toJsonValue } from '../../../../../common/lib';

export const clanInfoFields = (info: ClanInfo) =>
  ({
    tag: info.tag,
    name: info.name,
    color: info.color ?? null,
    motto: info.motto ?? null,
    description: info.description ?? null,
    emblems: toJsonValue(info.emblems),
    createdAt: fromUnixTime(info.created_at)
  }) satisfies Prisma.ClanUpdateInput;
