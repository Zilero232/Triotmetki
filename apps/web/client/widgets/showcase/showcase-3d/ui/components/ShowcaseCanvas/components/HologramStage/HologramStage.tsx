'use client';

import type { HologramStageProps } from './HologramStage.types';

import { useHologramStage } from '../../../../../model/hooks/use-hologram-stage';
import { FloorGrid } from '../FloorGrid';
import { HologramPart } from '../HologramPart';

export const HologramStage = ({ rig, sweep, isLive, drag }: HologramStageProps) => {
  'use no memo';

  const { body, turret, materials, rootRef, turretRef, offset } = useHologramStage({ rig, sweep, isLive, drag });

  return (
    <>
      <FloorGrid radius={rig.radius} shadow={materials.shadow} />
      <group ref={rootRef}>
        <group position={offset}>
          {body.map((part) => (
            <HologramPart key={part.key} materials={materials} part={part} />
          ))}
          {turret && (
            <group ref={turretRef} position={turret.position}>
              {turret.parts.map((part) => (
                <HologramPart key={part.key} materials={materials} part={part} />
              ))}
            </group>
          )}
        </group>
      </group>
    </>
  );
};
