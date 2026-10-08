'use client';

import { MOE } from '@otmetki/ratings';
import { useFormatter, useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import { TankAwards } from '@/entities/player/stats';
import { TankLink } from '@/entities/tank/tank';

import type { MarkRowProps } from './MarkRow.types';

import { MARKS } from '../../../../../config';
import { projectMarks } from '../../../../../lib/marks-projection';

import s from './MarkRow.module.scss';

export const MarkRow = ({ row, averageDamage }: MarkRowProps) => {
  const t = useTranslations('profile.marks');
  const format = useFormatter();

  const { vehicle, moePercent, marksOnGun, markOfMastery, nextMarkPercent, damageToNextMark, battles } = row;
  const percent = moePercent ?? 0;
  const projection = projectMarks({ row, averageDamage, targetPercent: MARKS.targetPercent });

  return (
    <li className={s.root}>
      <div className={s.tank}>
        <TankLink vehicle={vehicle} />
        <span className={s.battles}>{t('battles', { count: battles })}</span>
      </div>
      <div className={s.progress}>
        <div className={s.head}>
          <span className={s.percent}>{format.number(percent, { maximumFractionDigits: 2 })}%</span>
          {nextMarkPercent !== null && damageToNextMark !== null && (
            <span className={s.next}>{t('toNext', { percent: nextMarkPercent, damage: format.number(damageToNextMark) })}</span>
          )}
        </div>
        <div aria-hidden className={s.track}>
          <span className={s.fill} style={{ '--fill': `${percent}%` }} />
          {MOE.markPercents.map((mark) => (
            <span key={mark} className={s.tick} data-reached={percent >= mark} style={{ '--at': `${mark}%` }} />
          ))}
        </div>
        <span className={s.projection} data-kind={projection.kind}>
          {match(projection)
            .with({ kind: 'projected' }, ({ battles: count }) => t('projection.projected', { count }))
            .otherwise(({ kind }) => t(`projection.${kind}`))}
        </span>
      </div>
      <TankAwards className={s.awards} markOfMastery={markOfMastery} marksOnGun={marksOnGun} />
    </li>
  );
};
