import { match } from 'ts-pattern';

import type { Prisma } from '../../../../../generated';
import type { ReplaySearchQuery } from '../../replays.types';
import type { SearchWhereInput } from './replay-search.types';

import { insensitiveEquals } from '../../../../common/lib';

export const publicReplayWhere = { visibility: 'public', status: 'parsed' } as const satisfies Prisma.ReplayWhereInput;

const atLeast = (value: number | undefined) => (value === undefined ? undefined : { gte: value });

const tankCondition = ({ query: { tankId }, tankIds }: Pick<SearchWhereInput, 'query' | 'tankIds'>) => {
  if (tankIds === null) {
    return tankId;
  }

  return { in: tankId === undefined ? [...tankIds] : tankIds.filter((id) => id === tankId) };
};

export const searchWhere = ({ query, playerAccountId, tankIds }: SearchWhereInput): Prisma.ReplayWhereInput => {
  const participant = query.accountId === undefined ? playerAccountId : BigInt(query.accountId);

  return {
    ...publicReplayWhere,
    tankId: tankCondition({ query, tankIds }),
    ...(query.arenaId === undefined ? {} : { arenaId: query.arenaId }),
    ...(query.mode === undefined ? {} : { gameplayMode: query.mode }),
    ...(query.result === undefined ? {} : { result: query.result }),
    ...(query.clan === undefined ? {} : { clanTag: insensitiveEquals(query.clan) }),
    ...(query.version === undefined ? {} : { gameVersion: query.version }),
    ...(query.mastery === undefined ? {} : { markOfMastery: query.mastery }),
    ...(query.tags?.length ? { tags: { hasEvery: query.tags } } : {}),
    damageDealt: atLeast(query.minDamage),
    damageAssisted: atLeast(query.minAssist),
    damageBlocked: atLeast(query.minBlocked),
    frags: atLeast(query.minFrags),
    ...(participant === null ? {} : { playerAccountIds: { has: participant } })
  };
};

export const searchOrder = (sort: ReplaySearchQuery['sort']): Prisma.ReplayOrderByWithRelationInput[] =>
  match(sort)
    .with(
      'damage',
      () => [{ damageDealt: { sort: 'desc', nulls: 'last' } }, { playedAt: 'desc' }, { id: 'desc' }] satisfies Prisma.ReplayOrderByWithRelationInput[]
    )
    .with(
      'xp',
      () => [{ xp: { sort: 'desc', nulls: 'last' } }, { playedAt: 'desc' }, { id: 'desc' }] satisfies Prisma.ReplayOrderByWithRelationInput[]
    )
    .with('views', () => [{ views: 'desc' }, { playedAt: 'desc' }, { id: 'desc' }] satisfies Prisma.ReplayOrderByWithRelationInput[])
    .with(
      'recent',
      () => [{ playedAt: { sort: 'desc', nulls: 'last' } }, { createdAt: 'desc' }, { id: 'desc' }] satisfies Prisma.ReplayOrderByWithRelationInput[]
    )
    .exhaustive();
