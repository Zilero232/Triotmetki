import { formatSize } from '@/entities/replay/replay';

import type { DetailsPartProps } from '../../ReplayDetails.types';

import { useReplaysT } from '../../../../../model/hooks';

import s from './DetailsFile.module.scss';

export const DetailsFile = ({ item }: DetailsPartProps) => {
  const t = useReplaysT();

  return (
    <p className={s.file}>
      {item.id}
      <span className={s.fileMeta}>{`${formatSize(item.size)} ${t('size')} · ${t('version')} ${item.version ?? '?'}`}</span>
    </p>
  );
};
