import clsx from 'clsx';

import { formatMoment } from '@/entities/replay/replay';

import type { DetailsPartProps } from '../../ReplayDetails.types';

import { useReplaysT } from '../../../../../model/hooks';

import s from './DetailsHero.module.scss';

export const DetailsHero = ({ item }: DetailsPartProps) => {
  const t = useReplaysT();
  const outcome = item.result ?? 'unknown';

  return (
    <div className={s.hero}>
      {item.map_image ? <img alt='' className={s.heroImage} draggable={false} src={item.map_image} /> : <span className={s.heroEmpty} />}
      <span className={s.heroShade} />
      <span className={s.heroText}>
        <span className={clsx(s.outcome, s[outcome])}>{t(`outcome_${outcome}`)}</span>
        <span className={s.heroMap}>{item.map_title ?? item.map ?? item.title}</span>
        <span className={s.heroMeta}>{`${t(`type_${item.type}`)} · ${formatMoment(item.time)}`}</span>
      </span>
    </div>
  );
};
