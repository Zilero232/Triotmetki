import { clsx } from 'clsx';

import { Link } from '@/shared/i18n/navigation';
import { rankMedal } from '@/shared/lib';

import type { PodiumCardProps } from './PodiumCard.types';

import s from './PodiumCard.module.scss';

export const PodiumCard = ({ rank, rankLabel, name, metricLabel, value, tone, meta, href, glyph, className }: PodiumCardProps) => {
  const body = (
    <>
      {glyph && (
        <span aria-hidden className={s.glyph}>
          {glyph}
        </span>
      )}
      <span className={s.head}>
        <span className={s.rank}>
          <span className={s.srOnly}>{rankLabel}</span>
          <span aria-hidden>{rank}</span>
        </span>
        <span className={s.name} title={typeof name === 'string' ? name : undefined}>
          {name}
        </span>
      </span>
      <span className={s.figure}>
        <span className={s.label}>{metricLabel}</span>
        <span className={s.value}>{value}</span>
      </span>
      {meta && <span className={s.meta}>{meta}</span>}
    </>
  );

  return (
    <li className={clsx(s.root, className)} data-medal={rankMedal(rank)} data-rank={rank}>
      {href ? (
        <Link className={s.card} data-tone={tone ?? undefined} href={href}>
          {body}
        </Link>
      ) : (
        <div className={s.card} data-tone={tone ?? undefined}>
          {body}
        </div>
      )}
    </li>
  );
};
