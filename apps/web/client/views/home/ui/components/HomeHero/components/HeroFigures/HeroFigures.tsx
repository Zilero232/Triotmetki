'use client';

import { ArrowRight, Hourglass } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { EmptyState, ErrorState, KeyFigure, RelativeTime } from '@/ui-kit';

import { HOME_FIGURES, HOME_ICON } from '../../../../../config';
import { useServerStatus } from '../../../../../model/hooks';

import s from './HeroFigures.module.scss';

export const HeroFigures = () => {
  const t = useTranslations('home.hero');
  const status = useServerStatus();

  return (
    <aside aria-label={t('figures')} className={s.root}>
      {match(status.state)
        .with('error', () => (
          <div className={s.wide}>
            <ErrorState isCompact isRetrying={status.isRetrying} onRetry={status.retry} />
          </div>
        ))
        .with('empty', () => (
          <div className={s.notice}>
            <EmptyState isCompact isFramed icon={<Hourglass size={HOME_ICON.figure} />} role='status' title={t('empty')} />
          </div>
        ))
        .otherwise(() => (
          <>
            <KeyFigure
              className={s.figure}
              icon={<HOME_FIGURES.tracked.icon size={HOME_ICON.figure} />}
              label={t('tracked')}
              tone={HOME_FIGURES.tracked.tone}
              trend={status.trend}
              value={status.trackedPlayers}
              variant='tile'
            />
            {status.online === null && status.isActivityStale ? (
              <KeyFigure
                className={s.figure}
                hint={t('activityStaleHint')}
                icon={<HOME_FIGURES.online.icon size={HOME_ICON.figure} />}
                label={t('activityStale')}
                tone={HOME_FIGURES.online.tone}
                value={status.lastActiveAt ? <RelativeTime value={status.lastActiveAt} /> : t('activityPending')}
                variant='tile'
              />
            ) : status.online === null ? (
              <KeyFigure
                className={s.figure}
                hint={t('estimateHint')}
                icon={<HOME_FIGURES.online.icon size={HOME_ICON.figure} />}
                label={t('activeEstimate')}
                prefix={t('estimatePrefix')}
                tone={HOME_FIGURES.online.tone}
                value={status.activePlayers}
                variant='tile'
              />
            ) : (
              <KeyFigure
                className={s.figure}
                icon={<HOME_FIGURES.online.icon size={HOME_ICON.figure} />}
                label={t('online')}
                tone={HOME_FIGURES.online.tone}
                trend={status.trend}
                value={status.online}
                variant='tile'
              />
            )}
          </>
        ))}
      {status.isVersionShown && (
        <KeyFigure
          className={s.figure}
          hint={status.releasedAt ? <RelativeTime value={status.releasedAt} /> : undefined}
          icon={<HOME_FIGURES.version.icon size={HOME_ICON.figure} />}
          label={t('version')}
          tone={HOME_FIGURES.version.tone}
          value={status.version}
          variant='tile'
        />
      )}
      <Link className={s.more} href={ROUTES.pulse}>
        {t('pulse')}
        <ArrowRight aria-hidden size={HOME_ICON.more} />
      </Link>
    </aside>
  );
};
