'use client';

import type { MutationFeedbackSyncProps } from './MutationFeedbackSync.types';

import { useMutationFeedbackSync } from '../../model/hooks';

export const MutationFeedbackSync = ({ scope }: MutationFeedbackSyncProps) => {
  useMutationFeedbackSync(scope);

  return null;
};
