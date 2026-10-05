import type { InboxPage } from '@otmetki/schemas';

import { Injectable } from '@nestjs/common';

import type { InboxListInput, MarkReadInput } from '../notifications.types';

import { NOTIFICATION_EVENT_FROM_DB, readRecord, toIso } from '../../../common/lib';
import { PrismaService } from '../../../core';

@Injectable()
export class InboxReaderService {
  constructor(private readonly prisma: PrismaService) {}

  async list({ userId, limit, before }: InboxListInput): Promise<InboxPage> {
    const [rows, unread] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId, channel: 'site', ...(before ? { createdAt: { lt: new Date(before) } } : {}) },
        orderBy: { createdAt: 'desc' },
        take: limit
      }),
      this.prisma.notification.count({ where: { userId, channel: 'site', readAt: null } })
    ]);

    const items = rows.map((row) => {
      const payload = readRecord(row.payload);
      const text = (key: string) => (typeof payload[key] === 'string' ? payload[key] : '');

      return {
        id: row.id,
        event: NOTIFICATION_EVENT_FROM_DB[row.event],
        title: text('title'),
        body: text('body'),
        url: text('url') || null,
        createdAt: row.createdAt.toISOString(),
        readAt: toIso(row.readAt)
      };
    });

    return { items, unread };
  }

  async markRead({ userId, ids }: MarkReadInput): Promise<number> {
    const result = await this.prisma.notification.updateMany({
      where: { userId, channel: 'site', readAt: null, ...(ids ? { id: { in: ids } } : {}) },
      data: { readAt: new Date() }
    });

    return result.count;
  }
}
