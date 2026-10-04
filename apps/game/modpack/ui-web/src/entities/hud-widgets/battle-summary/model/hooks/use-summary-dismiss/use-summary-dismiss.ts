import { useCallback } from 'react';

import type { UseSummaryDismissInput } from './use-summary-dismiss.types';

import { sendHud } from '../../../../../../shared/api/hud-protocol';

export const useSummaryDismiss = ({ dismiss }: UseSummaryDismissInput) =>
  useCallback(() => {
    if (dismiss) {
      sendHud({ type: 'pressed', id: dismiss.id });
    }
  }, [dismiss]);
