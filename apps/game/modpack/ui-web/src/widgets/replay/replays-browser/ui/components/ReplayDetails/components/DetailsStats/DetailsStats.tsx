import type { DetailsPartProps } from '../../ReplayDetails.types';

import { detailStats } from '../../../../../lib/replay-labels';
import { useReplaysT } from '../../../../../model/hooks';
import { StatTile } from '../../../StatTile';

import s from './DetailsStats.module.scss';

export const DetailsStats = ({ item }: DetailsPartProps) => {
  const t = useReplaysT();

  if (item.result === null) {
    return <p className={s.note}>{t('noResults')}</p>;
  }

  return (
    <div className={s.stats}>
      {detailStats({ item, t }).map((stat) => (
        <StatTile key={stat.key} accent={stat.accent} label={stat.label} value={stat.value} wide={stat.wide} />
      ))}
    </div>
  );
};
