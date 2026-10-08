import { isNotFoundError, isPlusRequiredError, isUnauthorizedError } from '@/shared/api/source';

import type { AnalyticsStatus, AnalyticsStatusInput, ShouldRetryInput } from './analytics-status.types';

import { ANALYTICS_VIEW } from '../../config';

export const analyticsStatus = ({ requiresPlus, isPlus, isPlusPending, isPlusError, isPending, error }: AnalyticsStatusInput): AnalyticsStatus => {
  if (requiresPlus && isPlusPending) {
    return 'pending';
  }

  if (requiresPlus && isPlusError) {
    return 'error';
  }

  if ((requiresPlus && !isPlus) || isPlusRequiredError(error)) {
    return 'plus';
  }

  if (isNotFoundError(error)) {
    return 'noAccount';
  }

  if (error) {
    return 'error';
  }

  return isPending ? 'pending' : 'ready';
};

export const shouldRetryAnalytics = ({ failureCount, error }: ShouldRetryInput): boolean =>
  !isPlusRequiredError(error) && !isNotFoundError(error) && !isUnauthorizedError(error) && failureCount < ANALYTICS_VIEW.retryAttempts;
