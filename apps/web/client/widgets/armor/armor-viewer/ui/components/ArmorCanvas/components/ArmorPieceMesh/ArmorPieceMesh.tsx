'use client';

import type { ArmorPieceMeshProps } from './ArmorPieceMesh.types';

import { useArmorPieceGeometry } from '../../../../../model/hooks/use-armor-piece-geometry';

export const ArmorPieceMesh = ({ part, material, onPointerMove, onPointerOut }: ArmorPieceMeshProps) => {
  'use no memo';

  const geometry = useArmorPieceGeometry({ piece: part.piece, plates: part.plates });

  return (
    <mesh
      geometry={geometry}
      material={material}
      name={part.piece.name}
      position={part.position}
      onPointerMove={onPointerMove}
      onPointerOut={onPointerOut}
    />
  );
};
