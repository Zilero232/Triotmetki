import type { Prisma } from '../../../../generated';

export const SUPERTEST_ANNOUNCEMENT_SELECT = {
  id: true,
  url: true,
  title: true,
  summary: true,
  image: true,
  source: true,
  publishedAt: true,
  parsedAt: true,
  changes: {
    orderBy: { position: 'asc' },
    select: {
      id: true,
      tankId: true,
      tankName: true,
      isNewVehicle: true,
      param: true,
      label: true,
      fromValue: true,
      toValue: true,
      liveValue: true,
      unit: true,
      raw: true
    }
  }
} as const satisfies Prisma.SupertestAnnouncementSelect;
