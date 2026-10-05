import type { PlayerMarks } from '@otmetki/schemas';

import type { PlayerTank } from '../../../../generated';
import type { CatalogEntry } from '../../reference';
import type { PlaylistPick } from '../lib';

type MarkItem = PlayerMarks['items'][number];

export type ToPlaylistCandidatesInput = {
  tanks: readonly PlayerTank[];
  catalog: ReadonlyMap<number, CatalogEntry>;
  markOf: ReadonlyMap<number, MarkItem>;
  taken: ReadonlySet<number>;
  missionClasses: ReadonlySet<string>;
  now: Date;
};

export type ToPlaylistItemsInput = {
  picks: readonly PlaylistPick[];
  catalog: ReadonlyMap<number, CatalogEntry>;
  markOf: ReadonlyMap<number, MarkItem>;
};
