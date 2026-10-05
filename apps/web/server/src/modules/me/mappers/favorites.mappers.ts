import { match } from 'ts-pattern';

import type { Favorite } from '../me.types';
import type { ToFavoriteInput } from './favorites.types';

import { toNumber } from '../../../common/lib';

export const toFavorite = ({ row, nicknameOf, tagOf, catalog }: ToFavoriteInput): Favorite => ({
  id: row.id,
  kind: row.kind,
  targetId: toNumber(row.targetId),
  label: row.label,
  isOwn: row.isOwn,
  title: match(row.kind)
    .with('player', () => nicknameOf.get(row.targetId) ?? null)
    .with('clan', () => tagOf.get(row.targetId) ?? null)
    .otherwise(() => catalog.get(toNumber(row.targetId))?.summary.name ?? null),
  createdAt: row.createdAt.toISOString()
});
