import { formatMoment, romanTier } from '@/entities/replay/replay';
import { ClientIcon } from '@/ui-kit';

import type { RowPartProps } from '../../ReplayRow.types';

import { rowMeta } from '../../../../../lib/replay-labels';
import { useReplaysT } from '../../../../../model/hooks';

import s from './RowMain.module.scss';

export const RowMain = ({ item }: RowPartProps) => {
  const t = useReplaysT();
  const tier = romanTier(item.tier);

  return (
    <span className={s.main}>
      <span className={s.title}>
        {tier && <span className={s.tier}>{tier}</span>}
        <span className={s.tankName}>{item.tank ?? item.title}</span>
        {item.mastery_image && <ClientIcon className={s.mastery} icon={item.mastery_image} size={16} />}
      </span>
      <span className={s.meta}>{rowMeta({ item, typeLabel: t(`type_${item.type}`) })}</span>
      <span className={s.date}>{formatMoment(item.time)}</span>
    </span>
  );
};
