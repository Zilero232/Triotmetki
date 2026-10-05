'use client';

import { useEffect, useMemo } from 'react';

import type { ShowcaseRig } from '../../../lib/showcase-rig';

import { createHologramMaterials, disposeHologramMaterials } from '../../../lib/hologram-material';
import { partGeometry } from '../../../lib/part-geometry';

export const useHologramRig = (rig: ShowcaseRig) => {
  'use no memo';

  const built = useMemo(
    () => ({
      body: rig.body.map(partGeometry),
      turret: rig.turret && { position: rig.turret.position, parts: rig.turret.parts.map(partGeometry) },
      materials: createHologramMaterials({ height: rig.height })
    }),
    [rig]
  );

  useEffect(
    () => () => {
      for (const part of [...built.body, ...(built.turret?.parts ?? [])]) {
        part.fill.dispose();
        part.edges.dispose();
      }

      disposeHologramMaterials(built.materials);
    },
    [built]
  );

  return built;
};
