'use client';

import { TankShowcase3D } from '@/widgets/showcase/showcase-3d';

import { useHeroTanks } from '../../../../../model/hooks';
import { HeroEmblem } from '../HeroEmblem';

import s from './HeroStage.module.scss';

export const HeroStage = () => {
  const { rows, lead, hasShowcase, isPending } = useHeroTanks();

  return (
    <div className={s.root} data-nation={lead?.vehicle.nation} data-slot='showcase-3d'>
      {hasShowcase && (
        <>
          <span aria-hidden className={s.backdrop} />
          <TankShowcase3D className={s.showcase} tanks={rows.map((row) => row.vehicle)} />
        </>
      )}
      {!hasShowcase && !isPending && <HeroEmblem />}
    </div>
  );
};
