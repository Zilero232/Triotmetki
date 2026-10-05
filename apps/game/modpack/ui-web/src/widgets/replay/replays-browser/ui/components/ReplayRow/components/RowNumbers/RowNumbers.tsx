import clsx from 'clsx';

import { formatCount } from '@/entities/replay/replay';

import type { RowPartProps } from '../../ReplayRow.types';

import { useReplaysT } from '../../../../../model/hooks';

import s from './RowNumbers.module.scss';

export const RowNumbers = ({ item }: RowPartProps) => {
  const t = useReplaysT();

  return (
    <span className={s.numbers}>
      <span className={clsx(s.damage, item.damage === null && s.unknown)}>{formatCount(item.damage)}</span>
      <span className={s.minor}>
        {item.result === null
          ? t('outcome_unknown')
          : `${t('assistShort')} ${formatCount(item.assist)} · ${t('killsShort')} ${formatCount(item.kills)}`}
      </span>
    </span>
  );
};
