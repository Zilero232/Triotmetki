'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { ClanEmblem } from '@/entities/clan/clan';
import { CosmeticBadge } from '@/entities/player/cosmetics';
import { clanLabel } from '@/entities/player/player';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { ClassIcon, NationLabel, RelativeTime, Skeleton } from '@/ui-kit';

import type { HeaderIdentityProps } from './HeaderIdentity.types';

import s from './HeaderIdentity.module.scss';

export const HeaderIdentity = ({ summary, badge, kinds, isKindsLoading = false, isKindsFailed = false }: HeaderIdentityProps) => {
  const t = useTranslations('profile.header');
  const tGame = useTranslations('game');
  const format = useFormatter();

  const { clan, createdAt, lastBattleAt } = summary;

  return (
    <div className={s.root}>
      <div className={s.title}>
        {clan ? (
          <Link className={s.clan} href={ROUTES.clans.detail(clan.tag)}>
            <ClanEmblem size='xs' src={clan.emblem} tag={clan.tag} />
            <span className={s.tag}>{clanLabel({ tag: clan.tag })}</span>
            <span className={s.clanName} title={clan.name}>
              {clan.name}
            </span>
          </Link>
        ) : (
          <span className={s.muted}>{t('noClan')}</span>
        )}
        {badge && <CosmeticBadge code={badge} />}
      </div>
      {isKindsLoading && (
        <div aria-hidden className={s.kinds}>
          <Skeleton className={s.kindSkeleton} shape='block' />
        </div>
      )}
      {isKindsFailed && <p className={s.kindsFailed}>{t('favoritesFailed')}</p>}
      {(kinds.nation || kinds.tankClass) && (
        <ul aria-label={t('favorites')} className={s.kinds}>
          {kinds.nation && (
            <li className={s.kind}>
              <span className={s.kindLabel}>{t('favoriteNation')}</span>
              <NationLabel nation={kinds.nation.value} size={16} />
              <span className={s.kindShare}>{format.number(kinds.nation.share, { style: 'percent' })}</span>
            </li>
          )}
          {kinds.tankClass && (
            <li className={s.kind}>
              <span className={s.kindLabel}>{t('favoriteClass')}</span>
              <ClassIcon size={14} tankClass={kinds.tankClass.value} />
              <span>{tGame(`classes.${kinds.tankClass.value}`)}</span>
              <span className={s.kindShare}>{format.number(kinds.tankClass.share, { style: 'percent' })}</span>
            </li>
          )}
        </ul>
      )}
      <p className={s.meta}>
        {createdAt && <span>{t('since', { year: format.dateTime(new Date(createdAt), { year: 'numeric' }) })}</span>}
        {lastBattleAt && (
          <span>
            {t('lastBattle')} <RelativeTime value={lastBattleAt} />
          </span>
        )}
      </p>
    </div>
  );
};
