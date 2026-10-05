import type { Prisma } from '../../../../../generated';
import type { ToExpectedValueRecordInput } from './expected-value.types';

import { REFERENCE } from '../config/reference.constants';

export const toExpectedValueRecord = ({ values, date }: ToExpectedValueRecordInput): Prisma.Wn8ExpectedValueCreateManyInput => ({
  tankId: values.tankId,
  date,
  source: REFERENCE.wn8Source,
  expDamage: values.expDamage,
  expFrags: values.expFrag,
  expSpotted: values.expSpot,
  expDefense: values.expDef,
  expWinRate: values.expWinRate
});
