import { useMemo } from 'react';

import type { UiFigure } from '@/shared/api/protocol';

import { percentBox, percentPoint } from '../../../lib/figure';

export const useRowFigure = (figure: UiFigure) =>
  useMemo(
    () => ({
      shapes: figure.shapes.map((shape, index) => ({ key: `shape-${index}`, style: percentBox(shape) })),
      marks: figure.marks.map((mark, index) => ({ key: `mark-${index}`, tone: mark.tone, style: percentPoint(mark) }))
    }),
    [figure]
  );
