import type { IngestQuotaKeyInput } from './ingest-quota.types';

import { moscowDay } from '../../../../common/lib';
import { MOD_INGEST_QUOTA } from '../../config/ingest.constants';

export const ingestQuotaKey = ({ kind, accountId, now }: IngestQuotaKeyInput): string =>
  `${MOD_INGEST_QUOTA.keyPrefix}${kind}:${accountId}:${moscowDay(now)}`;
