import type { ModProfilesLibrary, ModSetsLibrary } from '@otmetki/schemas';

import type { LibraryRow, ProfilesView, SetsView } from '../mod-sync.types';

const revisionOf = (row: LibraryRow | null) => ({
  revision: row?.revision ?? 0,
  updated_at: row ? row.updatedAt.toISOString() : null
});

export const toSetsLibrary = ({ row, state }: SetsView): ModSetsLibrary => ({ sets: state.items, deleted: state.deleted, ...revisionOf(row) });

export const toProfilesLibrary = ({ row, state }: ProfilesView): ModProfilesLibrary => ({
  profiles: state.items,
  deleted: state.deleted,
  ...revisionOf(row)
});
