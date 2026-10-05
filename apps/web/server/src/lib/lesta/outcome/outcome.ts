import type { ClassifyLestaResponseInput, LestaOutcome } from './outcome.types';

import { RETRYABLE_LESTA_CODES } from '../errors/errors.constants';
import { LESTA_HTTP } from './outcome.constants';

export const classifyLestaResponse = ({ status, errorCode }: ClassifyLestaResponseInput): LestaOutcome => {
  if (status === LESTA_HTTP.tooManyRequests || status >= LESTA_HTTP.serverErrorFrom) {
    return 'degraded';
  }

  if (status >= LESTA_HTTP.clientErrorFrom) {
    return 'rejected';
  }

  if (errorCode === null) {
    return 'ok';
  }

  return RETRYABLE_LESTA_CODES.has(errorCode) ? 'degraded' : 'rejected';
};
