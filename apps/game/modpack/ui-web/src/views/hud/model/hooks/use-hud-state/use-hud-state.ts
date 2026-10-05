import { useEffect, useState } from 'react';

import type { MovedPanel, ScaledPanel } from '@/features/hud/edit-panels';
import type { HudState } from '@/shared/api/hud-protocol';

import { gameface } from '@/shared/api/gameface';
import { parseHudState, sendHud } from '@/shared/api/hud-protocol';
import { onDistinct } from '@/shared/lib/on-distinct';

import type { Overrides, Scales } from '../../../lib/label-layout';

import { clearedRecord, sharePanels } from '../../../lib/share-panels';

export const useHudState = () => {
  const [state, setState] = useState<HudState | null>(null);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [scales, setScales] = useState<Scales>({});

  useEffect(() => {
    const take = onDistinct((raw: string | null) => {
      const next = parseHudState(raw ?? '');

      if (next) {
        setState((previous) => sharePanels({ previous, next }));
        setOverrides(clearedRecord);
        setScales(clearedRecord);
      }
    });

    gameface.onDataChanged(() => take(gameface.state()));

    sendHud({ type: 'ready' });
  }, []);

  return {
    state,
    overrides,
    scales,
    onMoved: ({ id, placement }: MovedPanel) => setOverrides((current) => ({ ...current, [id]: placement })),
    onScaled: ({ id, scale }: ScaledPanel) => setScales((current) => ({ ...current, [id]: scale }))
  };
};
