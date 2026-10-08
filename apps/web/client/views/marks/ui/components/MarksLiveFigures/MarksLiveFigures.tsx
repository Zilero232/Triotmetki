'use client';

import { useMarksHeadStats } from '../../../model/hooks';
import { MarksHeadFigures } from '../MarksHeadFigures';

export const MarksLiveFigures = () => {
  const { isHidden, stats } = useMarksHeadStats();

  return isHidden ? null : <MarksHeadFigures stats={stats} />;
};
