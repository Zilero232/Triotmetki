import type { ModComponentSet, ModProfilesWriteRequest, ModSetsWriteRequest, ModSyncMode, ModSyncProfile } from '@otmetki/schemas';
import type { ZodType } from 'zod';

import type { ModSyncKind, ModSyncLibrary, Prisma } from '../../../generated';
import type { SyncEntry, SyncState } from './lib/library-merge/library-merge.types';

export type LibraryRow = Pick<ModSyncLibrary, 'revision' | 'updatedAt'>;

export type StoredLibrary<T extends SyncEntry> = {
  row: LibraryRow | null;
  state: SyncState<T>;
};

type LibraryKindInput<T extends SyncEntry> = {
  userId: string;
  kind: ModSyncKind;
  schema: ZodType<SyncState<T>>;
};

export type LoadLibraryInput<T extends SyncEntry> = LibraryKindInput<T> & {
  db: Prisma.TransactionClient;
};

export type SaveLibraryInput<T extends SyncEntry> = LibraryKindInput<T> & {
  incoming: SyncState<T>;
  mode: ModSyncMode;
  limit: number;
};

export type SaveSetsInput = {
  userId: string;
  body: Pick<ModSetsWriteRequest, 'deleted' | 'mode' | 'sets'>;
};

export type SaveProfilesInput = {
  userId: string;
  body: Pick<ModProfilesWriteRequest, 'deleted' | 'mode' | 'profiles'>;
};

export type SetsView = StoredLibrary<ModComponentSet>;

export type ProfilesView = StoredLibrary<ModSyncProfile>;
