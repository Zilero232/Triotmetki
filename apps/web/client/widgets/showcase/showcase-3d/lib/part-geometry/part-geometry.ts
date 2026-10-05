import { BufferAttribute, BufferGeometry, EdgesGeometry } from 'three';

import type { ShowcasePart } from '../showcase-rig';

import { HOLOGRAM_SHADING } from '../../config';

export const partGeometry = ({ piece, position }: ShowcasePart) => {
  const indexed = new BufferGeometry();

  indexed.setAttribute('position', new BufferAttribute(piece.positions, 3));
  indexed.setIndex(new BufferAttribute(piece.indices, 1));

  const fill = indexed.toNonIndexed();

  fill.computeVertexNormals();

  const edges = new EdgesGeometry(indexed, HOLOGRAM_SHADING.edgeThresholdDegrees);

  indexed.dispose();

  return { key: piece.name, position, fill, edges };
};
