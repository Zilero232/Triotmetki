import type { MissionProgressItem } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { UpdateProgressInput } from '../missions.types';

import { AppNotFoundException } from '../../../common/exceptions';
import { PrismaService } from '../../../core';
import { toProgressItem } from '../mappers/mission.mappers';

@Injectable()
export class MissionProgressWriterService {
  constructor(private readonly prisma: PrismaService) {}

  async update({ userId, questId, done, honors }: UpdateProgressInput): Promise<MissionProgressItem> {
    const exists = await this.prisma.mission.findFirst({ where: { questId }, select: { questId: true } });

    if (!exists) {
      throw new AppNotFoundException('NOT_FOUND', `No mission ${questId}`);
    }

    const state = { done: done || honors, honors, source: 'manual' as const };
    const row = await this.prisma.userMissionProgress.upsert({
      where: { userId_questId: { userId, questId } },
      create: { userId, questId, ...state },
      update: state
    });

    return toProgressItem(row);
  }
}
