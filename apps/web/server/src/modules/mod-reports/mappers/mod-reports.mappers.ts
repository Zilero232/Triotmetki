import type { ModProblemReportReceipt } from '@otmetki/schemas';

import { MOD_REPORTS } from '@otmetki/schemas';
import { addDays } from 'date-fns';

import type { ModProblemReport } from '../../../../generated';

export const toReportReceipt = ({ id, createdAt }: Pick<ModProblemReport, 'createdAt' | 'id'>): ModProblemReportReceipt => ({
  id,
  expires_at: addDays(createdAt, MOD_REPORTS.retentionDays).toISOString()
});
