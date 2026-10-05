import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import type { GameEvent } from '../../../../../generated';
import type { PrismaService } from '../../../../core';

import { EVENT_CALENDAR } from '../../config/calendar.constants';
import { EVENT_KIND_TO_DB } from '../../lib/event-kind/event-kind.constants';
import { EventReaderService } from '../event-reader.service';

const now = new Date('2026-09-25T12:00:00Z');
const dayMs = 86_400_000;

const event: GameEvent = {
  id: 'e1',
  slug: 'natisk',
  kind: 'battlePass',
  title: 'Боевой пропуск',
  description: null,
  url: 'https://tanki.su/ru/news/game-events/bp/',
  image: 'javascript:alert(1)',
  data: null,
  startsAt: now,
  endsAt: null,
  createdAt: now,
  updatedAt: now
};

beforeEach(() => {
  vi.useFakeTimers({ now });
});

afterEach(() => {
  vi.useRealTimers();
});

describe('EventReaderService.calendar', () => {
  it('translates the public kind and uses the default window around now', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.gameEvent.findMany.mockResolvedValue([event]);

    const [view] = await new EventReaderService(prisma).calendar({ kind: 'battle_pass' });
    const where = prisma.gameEvent.findMany.mock.calls[0]?.[0]?.where;
    const start = new Date(now.getTime() - EVENT_CALENDAR.defaultWindowDays * dayMs);

    expect(where).toEqual({
      kind: EVENT_KIND_TO_DB.battle_pass,
      startsAt: { lte: new Date(now.getTime() + EVENT_CALENDAR.defaultWindowDays * dayMs) },
      OR: [{ endsAt: null, startsAt: { gte: start } }, { endsAt: { gte: start } }]
    });

    expect(view?.kind).toBe('battle_pass');
    expect(view?.image).toBeNull();
  });

  it('honours an explicit range', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.gameEvent.findMany.mockResolvedValue([]);

    await new EventReaderService(prisma).calendar({ from: '2026-09-01T00:00:00.000Z', to: '2026-09-30T00:00:00.000Z' });

    const where = prisma.gameEvent.findMany.mock.calls[0]?.[0]?.where;

    expect(where).not.toHaveProperty('kind');
    expect(where?.startsAt).toEqual({ lte: new Date('2026-09-30T00:00:00.000Z') });
  });
});

describe('EventReaderService.activeDrops', () => {
  it('keeps drops that have not ended or are open-ended and recent', async () => {
    const prisma = mockDeep<PrismaService>();

    prisma.gameEvent.findMany.mockResolvedValue([]);

    await new EventReaderService(prisma).activeDrops();

    expect(prisma.gameEvent.findMany.mock.calls[0]?.[0]?.where).toEqual({
      kind: 'drops',
      OR: [{ endsAt: { gte: now } }, { endsAt: null, startsAt: { gte: new Date(now.getTime() - EVENT_CALENDAR.newsLookbackDays * dayMs) } }]
    });
  });
});
