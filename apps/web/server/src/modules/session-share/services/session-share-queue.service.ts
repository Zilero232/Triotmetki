import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import type { SessionEndedEvent, SessionEventsSink } from '../../developer';
import type { SessionSharePayload } from '../config/session-share-queue.types';
import type { EnqueueShareInput } from '../session-share.types';

import { PrismaService } from '../../../core';
import { SESSION_SHARE_QUEUE } from '../config/session-share-queue.constants';
import { SESSION_SHARE } from '../config/session-share.constants';
import { linkedShareChannels } from '../lib/share-channels';
import { SHARE_RECIPIENT_SELECT } from '../selects/session-share.selects';

@Injectable()
export class SessionShareQueueService implements SessionEventsSink {
  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(SESSION_SHARE_QUEUE.name) private readonly queue: Queue<SessionSharePayload>
  ) {}

  async enqueue({ userId, sessionId, channels, isAutomatic = false }: EnqueueShareInput): Promise<void> {
    await this.queue.addBulk(
      channels.map((channel) => ({
        name: SESSION_SHARE_QUEUE.jobs.send,
        data: { userId, sessionId, channel },
        opts: {
          ...(isAutomatic ? { jobId: [SESSION_SHARE.autoJobPrefix, userId, sessionId, channel].join('__') } : {}),
          attempts: SESSION_SHARE_QUEUE.attempts,
          backoff: { type: 'exponential', delay: SESSION_SHARE_QUEUE.backoffMs }
        }
      }))
    );
  }

  async ended({ sessionId, accountId }: SessionEndedEvent): Promise<void> {
    const preferences = await this.prisma.sessionSharePreference.findMany({
      where: { enabled: true, user: { lestaAccounts: { some: { accountId } } } },
      select: { userId: true, channels: true, user: { select: SHARE_RECIPIENT_SELECT } }
    });

    for (const preference of preferences) {
      const linked = linkedShareChannels(preference.user);
      const channels = preference.channels.filter((channel) => linked.includes(channel));

      if (channels.length > 0) {
        await this.enqueue({ userId: preference.userId, sessionId, channels, isAutomatic: true });
      }
    }
  }
}
