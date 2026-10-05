import { DetailList } from '@/ui-kit';

import type { RowDetailsProps } from './RowDetails.types';

import { MarksReport } from '../MarksReport';
import { RowFigure } from '../RowFigure';

export const RowDetails = ({ row }: RowDetailsProps) => (
  <>
    {row.figure && <RowFigure figure={row.figure} />}
    {row.report && <MarksReport report={row.report} />}
    {row.details && <DetailList items={row.details} />}
  </>
);
