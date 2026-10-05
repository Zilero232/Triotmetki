import type { BonusCodeStatus } from '../../../../../generated';
import type { BonusStatusInput, ReportedStatus, ReportedStatusInput, ReportTalliesInput, ReportTally } from './bonus-status.types';

import { BONUS_CODE } from '../../config/bonus-codes.constants';

export const bonusCodeStatus = ({ working, expired, expiresAt, now }: BonusStatusInput): BonusCodeStatus => {
  if (expiresAt && expiresAt.getTime() <= now.getTime()) {
    return 'expired';
  }

  const total = working + expired;

  if (total < BONUS_CODE.minReports) {
    return 'unknown';
  }

  if (expired / total >= BONUS_CODE.verdictShare) {
    return 'expired';
  }

  return working / total >= BONUS_CODE.verdictShare ? 'working' : 'unknown';
};

const emptyTally: ReportTally = { working: 0, expired: 0, lastReportAt: null };

export const reportTallies = ({ counts, latest }: ReportTalliesInput): Map<string, ReportTally> => {
  const tallies = new Map<string, ReportTally>();
  const tallyOf = (code: string): ReportTally => tallies.get(code) ?? { ...emptyTally };

  for (const { code, verdict, count } of counts) {
    const tally = tallyOf(code);

    if (verdict === 'working') {
      tally.working += count;
    }

    if (verdict === 'expired') {
      tally.expired += count;
    }

    tallies.set(code, tally);
  }

  for (const { code, createdAt } of latest) {
    tallies.set(code, { ...tallyOf(code), lastReportAt: createdAt });
  }

  return tallies;
};

export const reportedStatus = ({ tally = emptyTally, expiresAt, now }: ReportedStatusInput): ReportedStatus => ({
  workingReports: tally.working,
  expiredReports: tally.expired,
  lastReportAt: tally.lastReportAt,
  status: bonusCodeStatus({ working: tally.working, expired: tally.expired, expiresAt, now })
});
