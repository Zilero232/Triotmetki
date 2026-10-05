'use client';

import type { ArmorSceneProps } from './ArmorScene.types';

import { useArmorScene } from '../../../../../model/hooks/use-armor-scene';
import { ArmorPieceMesh } from '../ArmorPieceMesh';

export const ArmorScene = ({ parts, shader, onHover, onLeave }: ArmorSceneProps) => {
  'use no memo';

  const { material, onPointerMove } = useArmorScene({ parts, shader, onHover });

  return (
    <group>
      {parts.map((part) => (
        <ArmorPieceMesh key={part.layer} material={material} part={part} onPointerMove={onPointerMove} onPointerOut={onLeave} />
      ))}
    </group>
  );
};
