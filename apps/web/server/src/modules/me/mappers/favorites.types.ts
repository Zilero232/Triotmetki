import type { Follow } from '../../../../generated';
import type { CatalogEntry } from '../../reference';

export type ToFavoriteInput = {
  row: Follow;
  nicknameOf: ReadonlyMap<bigint, string>;
  tagOf: ReadonlyMap<bigint, string>;
  catalog: ReadonlyMap<number, CatalogEntry>;
};
