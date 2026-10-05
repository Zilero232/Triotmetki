import type { ModProfilesLibrary, ModSetsLibrary, ModSyncLibraries } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { MOD_SYNC } from '@otmetki/schemas';
import { isDeepEqual } from 'remeda';

import type { SyncEntry } from '../lib/library-merge/library-merge.types';
import type { LoadLibraryInput, SaveLibraryInput, SaveProfilesInput, SaveSetsInput, StoredLibrary } from '../mod-sync.types';

import { lockedTransaction, PrismaService } from '../../../core';
import { MOD_SYNC_API } from '../config/mod-sync.constants';
import { storedProfilesSchema, storedSetsSchema } from '../dto/mod-sync.schemas';
import { sanitizeProfile, sanitizeSet } from '../lib/library-items/library-items';
import { emptyLibrary, writeLibrary } from '../lib/library-merge/library-merge';
import { toProfilesLibrary, toSetsLibrary } from '../mappers/library.mappers';

@Injectable()
export class ModSyncWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async sets(userId: string): Promise<ModSetsLibrary> {
    return toSetsLibrary(await this.load({ db: this.prisma, userId, kind: 'sets', schema: storedSetsSchema }));
  }

  async profiles(userId: string): Promise<ModProfilesLibrary> {
    return toProfilesLibrary(await this.load({ db: this.prisma, userId, kind: 'profiles', schema: storedProfilesSchema }));
  }

  async libraries(userId: string): Promise<ModSyncLibraries> {
    const [sets, profiles] = await Promise.all([this.sets(userId), this.profiles(userId)]);

    return { sets, profiles };
  }

  async saveSets({ userId, body }: SaveSetsInput): Promise<ModSetsLibrary> {
    const saved = await this.save({
      userId,
      kind: 'sets',
      schema: storedSetsSchema,
      incoming: { items: body.sets.map(sanitizeSet), deleted: body.deleted },
      mode: body.mode,
      limit: MOD_SYNC.maxSets
    });

    return toSetsLibrary(saved);
  }

  async saveProfiles({ userId, body }: SaveProfilesInput): Promise<ModProfilesLibrary> {
    const saved = await this.save({
      userId,
      kind: 'profiles',
      schema: storedProfilesSchema,
      incoming: { items: body.profiles.map(sanitizeProfile), deleted: body.deleted },
      mode: body.mode,
      limit: MOD_SYNC.maxProfiles
    });

    return toProfilesLibrary(saved);
  }

  async clear(userId: string): Promise<void> {
    await this.prisma.modSyncLibrary.deleteMany({ where: { userId } });
  }

  private async load<T extends SyncEntry>({ db, userId, kind, schema }: LoadLibraryInput<T>): Promise<StoredLibrary<T>> {
    const row = await db.modSyncLibrary.findUnique({ where: { userId_kind: { userId, kind } } });

    return { row, state: row ? schema.parse(row.data) : emptyLibrary<T>() };
  }

  private save<T extends SyncEntry>({ userId, kind, schema, incoming, mode, limit }: SaveLibraryInput<T>): Promise<StoredLibrary<T>> {
    return lockedTransaction({
      prisma: this.prisma,
      scope: MOD_SYNC_API.lockScope,
      key: `${userId}:${kind}`,
      run: async (tx) => {
        const current = await this.load({ db: tx, userId, kind, schema });
        const now = new Date();
        const state = writeLibrary({ stored: current.state, incoming, mode, limit, now });

        if (isDeepEqual(state, current.state)) {
          return current;
        }

        const data = schema.parse(state);

        const row = await tx.modSyncLibrary.upsert({
          where: { userId_kind: { userId, kind } },
          create: { userId, kind, data, revision: 1, updatedAt: now },
          update: { data, revision: { increment: 1 }, updatedAt: now }
        });

        return { row, state };
      }
    });
  }
}
