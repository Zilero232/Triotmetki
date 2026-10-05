import type { ApplyRequest, ModApplyList, SettingsShare, SettingsValues } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';
import { applicableGroupSchema, applyRequestSchema, settingsValuesSchema, valuesForApply } from '@otmetki/schemas';
import { subDays } from 'date-fns';

import type { AuthenticatedDevice } from '../../../mod';
import type { ApplyRequestInput, ApplyViewInput, ModApplyResultInput, ModExportInput, SetAnonymousInput } from '../settings.types';

import { AppBadRequestException, AppNotFoundException } from '../../../../common/exceptions';
import { toIso } from '../../../../common/lib';
import { PrismaService } from '../../../../core';
import { StreamerProfileWriterService } from '../../profiles';
import { SETTINGS_APPLY } from '../config/settings-apply.constants';
import { StreamerSettingsReaderService } from './streamer-settings-reader.service';
import { StreamerSettingsWriterService } from './streamer-settings-writer.service';

@Injectable()
export class SettingsShareWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly profiles: StreamerProfileWriterService,
    private readonly settings: StreamerSettingsReaderService,
    private readonly writer: StreamerSettingsWriterService
  ) {}

  async requestApply({
    userId,
    slug,
    groups,
    includeResolution = false,
    includeSensitivity = false,
    deviceId
  }: ApplyRequestInput): Promise<ApplyRequest> {
    const profile = await this.profiles.publicBySlug(slug);
    const values = await this.settings.valuesOf(profile.id);

    if (!values) {
      throw new AppNotFoundException('NOT_FOUND', `${slug} has no settings`);
    }

    const data = valuesForApply({ values, groups, includeResolution, includeSensitivity });
    const present = groups.filter((group) => data[group] !== undefined);

    if (present.length === 0) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'None of the chosen groups has values');
    }

    await this.prisma.settingsApplyRequest.updateMany({ where: { userId, status: 'pending' }, data: { status: 'expired' } });

    const request = await this.prisma.settingsApplyRequest.create({
      data: { userId, deviceId: deviceId ?? null, profileId: profile.id, groups: present, data }
    });

    return this.applyView({ ...request, slug });
  }

  async myRequests(userId: string): Promise<ApplyRequest[]> {
    const requests = await this.prisma.settingsApplyRequest.findMany({
      where: { userId },
      include: { profile: { select: { slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: SETTINGS_APPLY.historyLimit
    });

    return requests.map((request) => this.applyView({ ...request, slug: request.profile.slug }));
  }

  async share(userId: string): Promise<SettingsShare | null> {
    const share = await this.prisma.playerSettingsShare.findUnique({ where: { userId } });

    if (!share) {
      return null;
    }

    const values = settingsValuesSchema.safeParse(share.data);

    return { anonymousStats: share.anonymousStats, values: values.success ? values.data : {}, updatedAt: share.updatedAt.toISOString() };
  }

  async setAnonymous({ userId, anonymousStats }: SetAnonymousInput): Promise<SettingsShare> {
    const updated = await this.prisma.playerSettingsShare.updateMany({ where: { userId }, data: { anonymousStats } });

    if (updated.count === 0) {
      throw new AppNotFoundException('NOT_FOUND', 'Share your settings from the mod first');
    }

    const share = await this.share(userId);

    if (!share) {
      throw new AppNotFoundException('NOT_FOUND', 'No shared settings');
    }

    return share;
  }

  async removeShare(userId: string): Promise<void> {
    await this.prisma.playerSettingsShare.deleteMany({ where: { userId } });
  }

  async ingestExport({ device, body }: ModExportInput): Promise<void> {
    const values: SettingsValues = body.settings;

    if (body.target === 'profile') {
      const profile = await this.prisma.streamerProfile.findUnique({ where: { userId: device.userId } });

      if (!profile) {
        throw new AppNotFoundException('NOT_FOUND', 'No streamer profile for this device');
      }

      const current = (await this.settings.valuesOf(profile.id)) ?? {};

      await this.writer.save({ profileId: profile.id, userId: device.userId, source: 'mod', values: { ...current, ...values } });
    }

    await this.prisma.playerSettingsShare.upsert({
      where: { userId: device.userId },
      create: { userId: device.userId, accountId: device.accountId, data: values, anonymousStats: body.anonymous_stats },
      update: { accountId: device.accountId, data: values, anonymousStats: body.anonymous_stats }
    });
  }

  async pendingForDevice(device: AuthenticatedDevice): Promise<ModApplyList> {
    await this.prisma.settingsApplyRequest.updateMany({
      where: { userId: device.userId, status: 'pending', createdAt: { lt: subDays(new Date(), SETTINGS_APPLY.expireDays) } },
      data: { status: 'expired' }
    });

    const requests = await this.prisma.settingsApplyRequest.findMany({
      where: { userId: device.userId, status: 'pending', OR: [{ deviceId: null }, { deviceId: device.id }] },
      include: { profile: { select: { slug: true } } },
      orderBy: { createdAt: 'asc' }
    });

    return {
      requests: requests.flatMap((request) => {
        const values = settingsValuesSchema.omit({ hardware: true, mods: true }).safeParse(request.data);

        return values.success
          ? [{ id: request.id, profile_slug: request.profile.slug, groups: this.groupsOf(request.groups), settings: values.data }]
          : [];
      })
    };
  }

  async applyResult({ device, id, status }: ModApplyResultInput): Promise<void> {
    const updated = await this.prisma.settingsApplyRequest.updateMany({
      where: { id, userId: device.userId, status: 'pending' },
      data: { status, deviceId: device.id, appliedAt: status === 'applied' ? new Date() : null }
    });

    if (updated.count === 0) {
      throw new AppNotFoundException('NOT_FOUND', `No pending apply request ${id}`);
    }
  }

  private groupsOf(groups: readonly string[]) {
    return groups.flatMap((group) => {
      const parsed = applicableGroupSchema.safeParse(group);

      return parsed.success ? [parsed.data] : [];
    });
  }

  private applyView(request: ApplyViewInput): ApplyRequest {
    return {
      id: request.id,
      slug: request.slug,
      groups: this.groupsOf(request.groups),
      status: applyRequestSchema.shape.status.parse(request.status),
      createdAt: request.createdAt.toISOString(),
      appliedAt: toIso(request.appliedAt)
    };
  }
}
