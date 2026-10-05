import type { ReplaySummary as ReplayView } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { OwnReplayInput, UpdateVisibilityInput } from '../replays.types';

import { AppForbiddenException, AppNotFoundException } from '../../../common/exceptions';
import { AppConfigService } from '../../../config';
import { ObjectStorage, PrismaService } from '../../../core';
import { toReplayView } from '../mappers/replay-view.mappers';

@Injectable()
export class ReplayOwnerWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
    private readonly config: AppConfigService
  ) {}

  async updateVisibility({ id, userId, visibility }: UpdateVisibilityInput): Promise<ReplayView> {
    const { hiddenAt } = await this.owned({ id, userId });

    if (hiddenAt && visibility !== 'private') {
      throw new AppForbiddenException('FORBIDDEN', 'A moderator hid this replay');
    }

    const replay = await this.prisma.replay.update({ where: { id }, data: { visibility } });

    return toReplayView({ replay, viewerUserId: userId, apiUrl: this.config.get('API_URL') });
  }

  async remove({ id, userId }: OwnReplayInput): Promise<void> {
    const replay = await this.owned({ id, userId });

    if (replay.timelineKey) {
      await this.storage.remove(replay.timelineKey);
    }

    await this.storage.remove(replay.storageKey);
    await this.prisma.replay.delete({ where: { id } });
  }

  private async owned({ id, userId }: OwnReplayInput) {
    const replay = await this.prisma.replay.findFirst({
      where: { id, uploaderUserId: userId },
      select: { storageKey: true, timelineKey: true, hiddenAt: true }
    });

    if (!replay) {
      throw new AppNotFoundException('NOT_FOUND', `No replay ${id} of yours`);
    }

    return replay;
  }
}
