import type { CareerRecordKey } from '../../mappers/career.types';
import type { CareerRecordTimes } from '../../selects/players.selects';

export type AchievedAtInput = {
  key: CareerRecordKey;
  value: number;
  times: CareerRecordTimes;
};
