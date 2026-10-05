import { ClientIcon } from '@/ui-kit';

import type { ReportHeaderProps } from './ReportHeader.types';

import { MARKS_REPORT_VIEW } from '../../../../../config';

import s from './ReportHeader.module.scss';

export const ReportHeader = ({ report, view }: ReportHeaderProps) => (
  <>
    <div className={s.header}>
      <ClientIcon icon={report.flag} size={17} width={25} />
      <ClientIcon icon={report.tier_icon} size={16} />
      <ClientIcon icon={report.cls} size={16} />
      <span className={s.name}>{report.name}</span>
      <ClientIcon icon={report.mark} size={24} />
      <span className={s.percent}>{view.percent}</span>
    </div>
    <div className={s.track}>
      <div className={s.fill} style={{ width: view.progress }} />
    </div>
    <div className={s.scale}>
      {MARKS_REPORT_VIEW.scale.map((mark) => (
        <span key={mark}>{mark}</span>
      ))}
    </div>
  </>
);
