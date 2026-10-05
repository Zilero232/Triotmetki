'use client';

import type { HologramTankProps } from './HologramTank.types';

import { TURRET_SWEEP } from '../../../../../config';
import { useShowcaseModel } from '../../../../../model/hooks/use-showcase-model';
import { HologramStage } from '../HologramStage';

export const HologramTank = ({ slug, isLive, drag, onReady }: HologramTankProps) => {
  const { rig, shownSlug, vehicleType } = useShowcaseModel({ slug, onReady });

  return rig && <HologramStage key={shownSlug} drag={drag} isLive={isLive} rig={rig} sweep={vehicleType ? TURRET_SWEEP[vehicleType] : 0} />;
};
