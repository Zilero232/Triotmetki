import clsx from 'clsx';

import { romanTier } from '@/entities/replay/replay';
import { ClientIcon } from '@/ui-kit';

import type { DetailsPartProps } from '../../ReplayDetails.types';

import { useReplaysT } from '../../../../../model/hooks';

import s from './DetailsVehicle.module.scss';

export const DetailsVehicle = ({ item }: DetailsPartProps) => {
  const t = useReplaysT();
  const tier = romanTier(item.tier);

  return (
    <div className={s.vehicle}>
      {item.tank_image && <img alt='' className={s.vehicleImage} draggable={false} src={item.tank_image} />}
      <span className={s.vehicleText}>
        <span className={s.vehicleName}>
          {tier && <span className={s.tier}>{tier}</span>}
          {item.tank ?? item.vehicle ?? item.title}
        </span>
        {item.survived !== null && (
          <span className={clsx(s.fate, item.survived ? s.alive : s.dead)}>{item.survived ? t('survived') : t('destroyed')}</span>
        )}
      </span>
      {item.mastery_image && <ClientIcon className={s.mastery} icon={item.mastery_image} size={32} />}
    </div>
  );
};
