import type { MarksReportProps } from './MarksReport.types';

import { marksReportView } from '../../../../../lib/marks-report';
import { ReportCards } from '../ReportCards';
import { ReportChart } from '../ReportChart';
import { ReportHeader } from '../ReportHeader';
import { ReportTable } from '../ReportTable';

import s from './MarksReport.module.scss';

export const MarksReport = ({ report }: MarksReportProps) => {
  const view = marksReportView(report);

  return (
    <div className={s.report}>
      <ReportHeader report={report} view={view} />
      <ReportCards cards={view.cards} />
      <ReportChart chart={view.chart} />
      <ReportTable rows={view.rows} />
    </div>
  );
};
