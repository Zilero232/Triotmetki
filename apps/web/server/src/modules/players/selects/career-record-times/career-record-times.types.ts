import type { Prisma } from '../../../../../generated';
import type { CAREER_RECORD_TIMES_SELECT } from './career-record-times';

export type CareerRecordTimes = Prisma.AccountModeStatsGetPayload<{ select: typeof CAREER_RECORD_TIMES_SELECT }>;
