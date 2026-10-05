import { formatCount } from '@/entities/replay/replay';

import type { SummaryStripProps } from './SummaryStrip.types';

import { REPLAYS_BROWSER } from '../../../config';
import { useReplaysT } from '../../../model/hooks';

import s from './SummaryStrip.module.scss';

export const SummaryStrip = ({ browser }: SummaryStripProps) => {
  const t = useReplaysT();
  const { summary, page } = browser;
  const progress = page?.progress;
  const indexing = page?.status === 'indexing' && progress !== undefined && progress.total > 0;
  const facts = [
    { key: 'winRate', label: t('winRate'), value: summary.winRate === null ? null : `${summary.winRate.toFixed(REPLAYS_BROWSER.winRateDigits)}%` },
    { key: 'avgDamage', label: t('avgDamage'), value: summary.avgDamage === null ? null : formatCount(summary.avgDamage) },
    { key: 'avgAssist', label: t('avgAssist'), value: summary.avgAssist === null ? null : formatCount(summary.avgAssist) },
    { key: 'avgXp', label: t('avgXp'), value: summary.avgXp === null ? null : formatCount(summary.avgXp) }
  ];

  return (
    <div className={s.strip}>
      <span className={s.count}>
        {t('shown')} <span className={s.number}>{summary.battles}</span> {t('of')} {browser.items.length}
      </span>
      {facts.map(
        (fact) =>
          fact.value !== null && (
            <span key={fact.key} className={s.fact}>
              <span className={s.factLabel}>{fact.label}</span>
              <span className={s.number}>{fact.value}</span>
            </span>
          )
      )}
      {indexing && (
        <span className={s.indexing}>
          <span className={s.indexingLabel}>
            {t('indexing')} {progress.done} / {progress.total}
          </span>
          <span className={s.track}>
            <span className={s.fill} style={{ width: `${(progress.done / progress.total) * REPLAYS_BROWSER.progressScale}%` }} />
          </span>
        </span>
      )}
    </div>
  );
};
