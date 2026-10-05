import { useEffect, useRef } from 'react';

import { sendHud } from '@/shared/api/hud-protocol';

import type { DrawnLabel } from './use-drawn-report.types';

export const useDrawnReport = (labels: DrawnLabel[]): void => {
  const ids = labels
    .filter(({ drawn }) => drawn)
    .map(({ id }) => id)
    .sort();

  const key = ids.join('\n');
  const sentRef = useRef('');

  useEffect(() => {
    if (key === sentRef.current) {
      return;
    }

    sentRef.current = key;
    sendHud({ type: 'drawn', ids: key ? key.split('\n') : [] });
  }, [key]);
};
