import { useLastPresent } from '@/shared/lib/use-last-present';

import type { CrosshairData } from '../../schemas';
import type { ShownMark } from './use-shown-mark.types';

export const useShownMark = ({ shape, size, color, outline }: CrosshairData): ShownMark | null => {
  const isShown = shape !== null;
  const lastShape = useLastPresent(shape);
  const lastOutline = useLastPresent(isShown ? outline : null);

  if (lastShape === null) {
    return null;
  }

  return { shape: lastShape, size, color, outline: lastOutline ?? false, isShown };
};
