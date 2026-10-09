'use client';

import { ChevronRight } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { vehicleIdentity } from '@/entities/tank/tank';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Breadcrumbs, NationBackdrop, TankImage, TierNumeral } from '@/ui-kit';

import type { BuildStageProps } from './BuildStage.types';

import { useBuildContext } from '../../../../../model/context';

import s from './BuildStage.module.scss';

export const BuildStage = ({ toggle, left, right, stats, compare, notice, actions }: BuildStageProps) => {
  const t = useTranslations('builds.showcase');
  const tGame = useTranslations('game');
  const tHead = useTranslations('builds.head');
  const { vehicle } = useBuildContext();

  const tank = vehicleIdentity(vehicle);

  return (
    <section className={s.root}>
      <div className={s.toggle}>{toggle}</div>
      <div className={s.left}>{left}</div>
      <div className={s.center}>
        <header className={s.head}>
          <Breadcrumbs isCurrentAccent items={[{ label: tHead('crumbBuilds'), href: ROUTES.builds.list }, { label: vehicle.name }]} />
          <span className={s.eyebrow}>{t('eyebrow')}</span>
          <h1 className={s.title} data-premium={tank.isPremium || undefined}>
            {vehicle.name}
          </h1>
          <nav className={s.path}>
            <Link href={{ pathname: ROUTES.tanks.list, query: { nations: vehicle.nation } }}>{tGame(`nations.${tank.nation}`)}</Link>
            <ChevronRight aria-hidden size={14} />
            <Link href={{ pathname: ROUTES.tanks.list, query: { types: vehicle.type } }}>{tGame(`classes.${tank.type}`)}</Link>
            <ChevronRight aria-hidden size={14} />
            <Link href={{ pathname: ROUTES.tanks.list, query: { tiers: vehicle.tier } }}>
              <TierNumeral tier={tank.tier} />
            </Link>
          </nav>
        </header>
        <div className={s.render}>
          <NationBackdrop className={s.flag} nation={tank.nation} />
          <span aria-hidden className={s.floor} />
          <TankImage isDecorative isPriority className={s.image} size='large' tank={tank} withTint={false} />
        </div>
        {compare}
      </div>
      <div className={s.right}>
        {right}
        <div className={s.stats}>{stats}</div>
      </div>
      <div className={s.notice}>{notice}</div>
      <div className={s.actions}>{actions}</div>
    </section>
  );
};
