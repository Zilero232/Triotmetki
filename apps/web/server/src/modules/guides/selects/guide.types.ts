import type { Prisma } from '../../../../generated';
import type { GUIDE_INCLUDE } from './guide.selects';

export type GuideRow = Prisma.GuideGetPayload<{ include: typeof GUIDE_INCLUDE }>;
