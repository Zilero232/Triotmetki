import clsx from 'clsx';

import type { BattleCardProps } from './BattleCard.types';

import { hitCounts, resultLabel, vehicleLine } from '../../../../../lib/battle-line';

import s from './BattleCard.module.scss';

export const BattleCard = ({ battle, labels, sideLabels }: BattleCardProps) => {
  const result = resultLabel({ battle, labels });
  const counts = hitCounts(battle);

  return (
    <span className={s.card}>
      <span className={clsx(s.accent, battle.result && s[`${battle.result}Fill`])} />
      {battle.image ? <img alt='' className={s.thumb} src={battle.image} /> : <span className={s.thumbEmpty} />}
      <span className={s.body}>
        <span className={s.top}>
          <span className={s.map}>{battle.map}</span>
          {result && <span className={clsx(s.result, battle.result && s[battle.result])}>{result}</span>}
        </span>
        <span className={s.vehicle}>{vehicleLine(battle)}</span>
        <span className={s.bottom}>
          <span className={s.date}>{battle.date}</span>
          <span className={s.counts}>
            <span className={s.countLabel}>{sideLabels.received}</span>
            <span className={s.count}>{counts.received}</span>
            <span className={s.countLabel}>{sideLabels.dealt}</span>
            <span className={s.count}>{counts.dealt}</span>
          </span>
        </span>
      </span>
    </span>
  );
};
