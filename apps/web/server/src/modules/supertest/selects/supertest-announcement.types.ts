import type { Prisma } from '../../../../generated';
import type { SUPERTEST_ANNOUNCEMENT_SELECT } from './supertest-announcement.selects';

export type SupertestAnnouncementRow = Prisma.SupertestAnnouncementGetPayload<{ select: typeof SUPERTEST_ANNOUNCEMENT_SELECT }>;

export type SupertestChangeRow = SupertestAnnouncementRow['changes'][number];
