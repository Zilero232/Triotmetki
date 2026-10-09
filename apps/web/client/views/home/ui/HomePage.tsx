import { Band, Reveal } from '@/ui-kit';
import { PromoBoard } from '@/widgets/promo/promo-banners';

import {
  ClanActivity,
  CommunityBand,
  ForYou,
  GameNews,
  GarageStrip,
  HomeActions,
  HomeHero,
  MarksMovement,
  MyDashboard,
  StrongTanks,
  TopPlayers
} from './components';

import s from './HomePage.module.scss';

export const HomePage = () => (
  <div className={s.root}>
    <div className={s.head}>
      <HomeHero />
      <HomeActions />
    </div>
    <MyDashboard />
    <PromoBoard />
    <ForYou />
    <Reveal>
      <Band as='div' isDark={false} tone='raised' width='full'>
        <StrongTanks />
      </Band>
    </Reveal>
    <Reveal>
      <GarageStrip />
    </Reveal>
    <Reveal>
      <MarksMovement />
    </Reveal>
    <Reveal>
      <Band as='div' isDark={false} texture='noise' tone='raised' width='full'>
        <TopPlayers />
      </Band>
    </Reveal>
    <Reveal className={s.pair}>
      <GameNews />
      <ClanActivity />
    </Reveal>
    <Reveal>
      <CommunityBand />
    </Reveal>
  </div>
);
