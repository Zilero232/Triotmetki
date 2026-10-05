import { entries } from 'remeda';

import { SERVER_PERIOD_DAYS, SERVER_PERIOD_TO_DB } from '../../../../../../common/lib';

export const SERVER_STATS = {
  periods: entries(SERVER_PERIOD_TO_DB).map(([key, period]) => ({ period, days: SERVER_PERIOD_DAYS[key] })),
  allCohorts: 'all'
} as const;
