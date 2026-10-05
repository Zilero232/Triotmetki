import type { SettingsHistoryEntry, SettingsTableRow, SettingsValues, StreamerSettingsView } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { streamerSettingsSchema, toSettingsValues } from '@otmetki/schemas';

import { Prisma } from '../../../../../generated';
import { AppNotFoundException } from '../../../../common/exceptions';
import { PrismaService } from '../../../../core';
import { StreamerProfileWriterService, STREAMERS } from '../../profiles';
import { SETTINGS_HISTORY } from '../config/settings-history.constants';
import { toSettingsHistoryEntry } from '../mappers/settings-history.mappers';
import { toSettingsTableRow } from '../mappers/settings-table.mappers';
import { toSettingsView } from '../mappers/settings.mappers';
import { SETTINGS_TABLE_SELECT } from '../selects/settings-table.selects';

@Injectable()
export class StreamerSettingsReaderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: StreamerProfileWriterService
  ) {}

  async bySlug(slug: string): Promise<StreamerSettingsView> {
    return toSettingsView(await this.profiles.publicBySlug(slug));
  }

  async mine(userId: string): Promise<StreamerSettingsView> {
    const profile = await this.prisma.streamerProfile.findUnique({ where: { userId } });

    if (!profile) {
      throw new AppNotFoundException('NOT_FOUND', 'No streamer profile yet');
    }

    return toSettingsView(profile);
  }

  async history(slug: string): Promise<SettingsHistoryEntry[]> {
    const profile = await this.profiles.publicBySlug(slug);
    const versions = await this.prisma.streamerSettingsVersion.findMany({
      where: { profileId: profile.id },
      orderBy: { createdAt: 'desc' },
      take: SETTINGS_HISTORY.limit,
      select: { id: true, source: true, changedGroups: true, createdAt: true }
    });

    return versions.map(toSettingsHistoryEntry);
  }

  async table(): Promise<SettingsTableRow[]> {
    const rows = await this.prisma.streamerProfile.findMany({
      where: { hiddenAt: null, settings: { not: Prisma.DbNull }, ...(STREAMERS.editorialEnabled ? {} : { kind: 'claimed' }) },
      select: SETTINGS_TABLE_SELECT,
      orderBy: { settingsUpdatedAt: { sort: 'desc', nulls: 'last' } }
    });

    return rows.flatMap((row) => toSettingsTableRow(row) ?? []);
  }

  async compare(slugs: readonly string[]): Promise<StreamerSettingsView[]> {
    return Promise.all(slugs.map((slug) => this.bySlug(slug)));
  }

  async valuesOf(profileId: string): Promise<SettingsValues | null> {
    const current = await this.prisma.streamerProfile.findUnique({ where: { id: profileId }, select: { settings: true } });

    return current?.settings ? toSettingsValues(streamerSettingsSchema.parse(current.settings)) : null;
  }
}
