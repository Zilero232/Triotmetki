'use client';

import { Award, BarChart3, Eye, Target, Trophy, UserRound } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Card, Skeleton } from '@/ui-kit';

import { HOME, HOME_ICON } from '../../../config';
import { useForYou } from '../../../model/hooks';

import s from './ForYou.module.scss';

export const ForYou = () => {
  const t = useTranslations('home.forYou');
  const { isPending, isVisible, nickname, firstWin, leagueRank, challenges } = useForYou();

  if (isPending) {
    return (
      <div aria-hidden className={s.root}>
        <Skeleton className={s.skeleton} shape='block' />
      </div>
    );
  }

  if (!isVisible) {
    return null;
  }

  return (
    <section aria-label={t('label')} className={s.root}>
      <Card className={s.card}>
        <div className={s.head}>
          <h2 className={s.title}>{nickname ? t('title', { nickname }) : t('titleNoAccount')}</h2>
          {firstWin && (
            <p className={s.firstWin} data-available={firstWin.available > 0}>
              <Trophy aria-hidden size={HOME_ICON.forYou} />
              {firstWin.available > 0 ? t('firstWin', { count: firstWin.available }) : t('firstWinTaken')}
            </p>
          )}
        </div>
        <nav className={s.links}>
          {nickname && (
            <>
              <Link className={s.link} href={ROUTES.players.profile(nickname)}>
                <UserRound aria-hidden size={HOME_ICON.forYou} />
                {t('profile')}
              </Link>
              <Link className={s.link} href={{ pathname: ROUTES.players.profile(nickname), query: HOME.forYou.marksQuery }}>
                <Trophy aria-hidden size={HOME_ICON.forYou} />
                {t('marks')}
              </Link>
              <Link className={s.link} href={ROUTES.social.leagues}>
                <Award aria-hidden size={HOME_ICON.forYou} />
                {leagueRank === null ? t('league') : t('leagueRank', { rank: leagueRank })}
              </Link>
              <Link className={s.link} href={ROUTES.social.challenges}>
                <Target aria-hidden size={HOME_ICON.forYou} />
                {challenges ? t('challengesProgress', challenges) : t('challenges')}
              </Link>
            </>
          )}
          <Link className={s.link} href={ROUTES.account.analytics}>
            <BarChart3 aria-hidden size={HOME_ICON.forYou} />
            {t('analytics')}
          </Link>
          <Link className={s.link} href={nickname ? ROUTES.account.watchlist : ROUTES.account.overview}>
            <Eye aria-hidden size={HOME_ICON.forYou} />
            {nickname ? t('watchlist') : t('link')}
          </Link>
        </nav>
      </Card>
    </section>
  );
};
