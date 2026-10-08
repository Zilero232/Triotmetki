export type AnalyticsStatus = 'error' | 'noAccount' | 'pending' | 'plus' | 'ready';

export type AnalyticsStatusInput = {
  requiresPlus: boolean;
  isPlus: boolean;
  isPlusPending: boolean;
  isPlusError: boolean;
  isPending: boolean;
  error: unknown;
};

export type ShouldRetryInput = {
  failureCount: number;
  error: unknown;
};
