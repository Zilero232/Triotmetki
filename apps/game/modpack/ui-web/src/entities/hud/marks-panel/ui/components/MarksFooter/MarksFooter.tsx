import clsx from 'clsx';

import { Glyph, TabularText, toneClass } from '@/ui-kit';

import type { MarksFooterProps } from './MarksFooter.types';

import { MARKS_PANEL } from '../../../config';
import { CountText } from '../CountText';

import s from './MarksFooter.module.scss';

export const MarksFooter = ({ damage, target }: MarksFooterProps) => {
  if (damage === null && target === null) {
    return null;
  }

  return (
    <div className={s.footer}>
      {damage !== null && (
        <span className={s.part}>
          <span className={s.label}>{damage.label}</span>
          <CountText className={clsx(s.value, toneClass(damage.tone))} value={damage.value} />
          <TabularText className={s.target} text={damage.target} />
        </span>
      )}
      {target !== null && (
        <span className={s.goal}>
          <span className={clsx(s.label, target.reached && s.reached)}>{target.label}</span>
          {target.reached ? (
            <Glyph name={MARKS_PANEL.checkGlyph} size={MARKS_PANEL.checkSize} tone='gold' />
          ) : (
            <CountText className={s.value} value={target.need} />
          )}
        </span>
      )}
    </div>
  );
};
