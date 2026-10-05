import { useEffect, useState } from 'react';

import { usePointerScope } from '@/shared/lib/pointer-scope';

import type { HoveredItemHandlers } from './use-hovered-item.types';

export const useHoveredItem = () => {
  const [hovered, setHovered] = useState<number | null>(null);
  const pointer = usePointerScope();

  useEffect(() => {
    if (!pointer) {
      // eslint-disable-next-line react/set-state-in-effect -- the panel stops taking the mouse when the battle cursor hides, and no mouseleave follows
      setHovered(null);
    }
  }, [pointer]);

  const handlers = (index: number): HoveredItemHandlers => ({
    onMouseEnter: () => setHovered(index),
    onMouseLeave: () => setHovered((current) => (current === index ? null : current))
  });

  return { hovered: pointer ? hovered : null, handlers };
};
