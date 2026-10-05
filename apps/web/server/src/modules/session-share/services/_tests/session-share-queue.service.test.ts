import type { Queue } from 'bullmq';

import { describe, expect, it } from 'vitest';
import { mock, mockDeep } from 'vitest-mock-extended';

import type { SessionSharePreference } from '../../../../../generated';
import type { PrismaService } from '../../../../core';
import type { SessionSharePayload } from '../../config/session-share-queue.types';
import type { ShareRecipientRow } from '../../selects/session-share.selects';

import { SESSION_SHARE_QUEUE } from '../../config/session-share-queue.constants';
import { SESSION_SHARE } from '../../config/session-share.constants';
import { SessionShareQueueService } from '../session-share-queue.service';

const SESSION = '3f0a4d5e-6b7c-4d8e-9f0a-1b2c3d4e5f60';

const createService = () => {
  const prisma = mockDeep<PrismaService>();
  const queue = mock<Queue<SessionSharePayload>>();

  return { service: new SessionShareQueueService(prisma, queue), prisma, queue };
};

describe('SessionShareQueueService.enqueue', () => {
  it('queues one job per channel so a failed channel retries alone', async () => {
    const { service, queue } = createService();

    await service.enqueue({ userId: 'user', sessionId: SESSION, channels: ['telegram', 'discord'] });

    const jobs = queue.addBulk.mock.calls[0]?.[0] ?? [];

    expect(jobs.map((job) => job.data.channel)).toEqual(['telegram', 'discord']);
    expect(jobs.every((job) => job.name === SESSION_SHARE_QUEUE.jobs.send && job.opts?.jobId === undefined)).toBe(true);
  });

  it('gives an automatic post a stable job id so a session is announced once per channel', async () => {
    const { service, queue } = createService();

    await service.enqueue({ userId: 'user', sessionId: SESSION, channels: ['telegram'], isAutomatic: true });

    expect(queue.addBulk.mock.calls[0]?.[0][0]?.opts?.jobId).toBe([SESSION_SHARE.autoJobPrefix, 'user', SESSION, 'telegram'].join('__'));
  });
});

describe('SessionShareQueueService.ended', () => {
  it('posts only for owners of the account who opted in, and only to channels still linked', async () => {
    const { service, prisma, queue } = createService();

    prisma.sessionSharePreference.findMany.mockResolvedValue([
      mock<SessionSharePreference & { user: ShareRecipientRow }>({
        userId: 'user',
        channels: ['telegram', 'discord'],
        user: { locale: 'ru', telegramAccount: { telegramId: 42n }, accounts: [] }
      })
    ]);

    await service.ended({ sessionId: SESSION, accountId: 7n });

    expect(prisma.sessionSharePreference.findMany.mock.calls[0]?.[0]?.where).toEqual({
      enabled: true,
      user: { lestaAccounts: { some: { accountId: 7n } } }
    });

    expect(queue.addBulk.mock.calls[0]?.[0].map((job) => job.data)).toEqual([{ userId: 'user', sessionId: SESSION, channel: 'telegram' }]);
  });

  it('queues nothing when no chosen channel is linked any more', async () => {
    const { service, prisma, queue } = createService();

    prisma.sessionSharePreference.findMany.mockResolvedValue([
      mock<SessionSharePreference & { user: ShareRecipientRow }>({
        userId: 'user',
        channels: ['discord'],
        user: { locale: 'ru', telegramAccount: null, accounts: [] }
      })
    ]);

    await service.ended({ sessionId: SESSION, accountId: 7n });

    expect(queue.addBulk).not.toHaveBeenCalled();
  });
});
