import type { ModBadgePreferenceAnswer } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { SaveBadgePreferenceInput } from '../mod-badges.types';

import { toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';

@Injectable()
export class ModBadgeWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async savePreference({ device, visible }: SaveBadgePreferenceInput): Promise<ModBadgePreferenceAnswer> {
    await this.prisma.modDevice.update({ where: { id: device.id }, data: { badgeVisible: visible, lastSeenAt: new Date() } });

    return { account_id: toNumber(device.accountId), visible };
  }
}
