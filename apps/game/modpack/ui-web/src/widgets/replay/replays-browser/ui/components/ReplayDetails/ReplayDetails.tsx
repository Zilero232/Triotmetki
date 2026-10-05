import { useWheelScroll } from '@/shared/lib/use-wheel-scroll';

import type { ReplayDetailsProps } from './ReplayDetails.types';

import { ConfirmBox, DetailsFile, DetailsHero, DetailsStats, DetailsVehicle, RenameBox, ReplayTools, SiteAction, WatchAction } from './components';

import s from './ReplayDetails.module.scss';

export const ReplayDetails = ({ item, browser }: ReplayDetailsProps) => {
  const scrollRef = useWheelScroll();

  return (
    <aside aria-label={item.title} className={s.details}>
      <DetailsHero item={item} />
      <div ref={scrollRef} className={s.scroll}>
        <DetailsVehicle item={item} />
        <DetailsStats item={item} />
        <div className={s.actions}>
          <WatchAction browser={browser} item={item} />
          <SiteAction browser={browser} item={item} />
          <ReplayTools browser={browser} item={item} />
          <RenameBox browser={browser} />
          <ConfirmBox browser={browser} item={item} kind='remove' />
        </div>
        <DetailsFile item={item} />
      </div>
    </aside>
  );
};
