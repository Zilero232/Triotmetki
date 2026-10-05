import type { SettingsGroupKey, SettingsProvenance, StreamerSettingsView } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { changedGroups, settingsGroupKeySchema, streamerSettingsSchema, toSettingsValues } from '@otmetki/schemas';

import type { SaveEditorialSettingsInput, SaveMySettingsInput, SaveSettingsRequest } from '../settings.types';

import { AppNotFoundException } from '../../../../common/exceptions';
import { PrismaService } from '../../../../core';
import { StreamerProfileWriterService } from '../../profiles';
import { StreamerSettingsReaderService } from './streamer-settings-reader.service';

@Injectable()
export class StreamerSettingsWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: StreamerProfileWriterService,
    private readonly reader: StreamerSettingsReaderService
  ) {}

  async saveMine({ userId, ...input }: SaveMySettingsInput): Promise<StreamerSettingsView> {
    const profile = await this.prisma.streamerProfile.findUnique({ where: { userId } });

    if (!profile) {
      throw new AppNotFoundException('NOT_FOUND', 'No streamer profile yet');
    }

    await this.save({ ...input, userId, profileId: profile.id });

    return this.reader.mine(userId);
  }

  async saveEditorial({ slug, ...input }: SaveEditorialSettingsInput): Promise<void> {
    const profile = await this.profiles.publicBySlug(slug);

    await this.save({ ...input, profileId: profile.id, source: 'editorial' });
  }

  async save({ profileId, userId, source, values, sourceUrls }: SaveSettingsRequest): Promise<void> {
    const current = await this.prisma.streamerProfile.findUniqueOrThrow({ where: { id: profileId }, select: { settings: true } });
    const previous = current.settings === null ? null : streamerSettingsSchema.parse(current.settings);
    const previousValues = previous ? toSettingsValues(previous) : null;
    const changed = changedGroups({ previous: previousValues, next: values });
    const checkedAt = new Date().toISOString();
    const next: Partial<Record<SettingsGroupKey, unknown>> = {};

    for (const group of settingsGroupKeySchema.options) {
      const content = values[group];

      if (!content) {
        continue;
      }

      next[group] = changed.includes(group)
        ? { ...content, source, sourceUrl: sourceUrls?.[group] ?? null, checkedAt }
        : { ...content, ...this.provenanceOf(previous?.[group]) };
    }

    const data = streamerSettingsSchema.parse(next);

    if (changed.length === 0 && previous) {
      return;
    }

    await this.prisma.$transaction([
      this.prisma.streamerProfile.update({ where: { id: profileId }, data: { settings: data, settingsUpdatedAt: new Date() } }),
      this.prisma.streamerSettingsVersion.create({ data: { profileId, data, source, changedGroups: changed, createdBy: userId } })
    ]);
  }

  private provenanceOf(group: SettingsProvenance | undefined) {
    return group ? { source: group.source, sourceUrl: group.sourceUrl, checkedAt: group.checkedAt } : {};
  }
}
