import type { CareerRecordKey } from '../../mappers';
import type { CareerRecordTimes } from '../../selects';

export type AchievedAtInput = {
  key: CareerRecordKey;
  value: number;
  times: CareerRecordTimes;
};
