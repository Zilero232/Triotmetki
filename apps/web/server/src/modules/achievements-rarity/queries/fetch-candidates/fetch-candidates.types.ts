import type { AccountAchievements } from '../../../../../generated';

export type FetchCandidatesInput = {
  staleBefore: Date;
  limit: number;
};

export type FetchCandidateRow = Pick<AccountAchievements, 'accountId'>;
