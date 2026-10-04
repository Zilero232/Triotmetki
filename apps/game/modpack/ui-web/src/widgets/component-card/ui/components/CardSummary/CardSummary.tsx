import type { CardSummaryProps } from './CardSummary.types';

import { useT } from '../../../../../entities/window-state';

import s from './CardSummary.module.scss';

export const CardSummary = ({ kind, summary }: CardSummaryProps) => {
  const t = useT();

  if (kind === 'keys') {
    return (
      <div aria-label={t('summaryKeys')} className={s.summary} role='group'>
        {summary.keys.map((chip) => (
          <span key={chip.key} className={s.keyRow}>
            <span className={s.keyLabel}>{chip.label}</span>
            <span className={chip.value ? s.key : s.keyEmpty}>{chip.value ?? t('summaryNoKey')}</span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div aria-label={t('summaryChecked')} className={s.summary} role='group'>
      <span className={s.caption}>{t('summaryChecked')}</span>
      {summary.checked.length === 0 && <span className={s.empty}>{t('summaryNothing')}</span>}
      {summary.checked.map((label) => (
        <span key={label} className={s.item}>
          <span className={s.tick} />
          {label}
        </span>
      ))}
    </div>
  );
};
