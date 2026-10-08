'use client';

import { Download } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ModeIcon } from '@/entities/map/map';
import { TankLink } from '@/entities/tank/tank';
import { ReplayResultBadge } from '@/features/community/replay-meta';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Badge, buttonVariants, Card, GameVersionBadge, KeyFigure, KeyFigures, PageHeader } from '@/ui-kit';

import { useReplay } from '../../../model/context';
import { useReplayOverview } from '../../../model/hooks';
import { ReplayOwnerActions } from '../ReplayOwnerActions';

import s from './ReplayOverview.module.scss';

export const ReplayOverview = () => {
  const t = useTranslations('replays.detail');
  const replay = useReplay();
  const { title, vehicle, owner, mode, modeLabel, downloadHref, duration, playedAt, figures } = useReplayOverview();

  return (
    <>
      <PageHeader
        actions={
          downloadHref && (
            <a download className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={downloadHref}>
              <Download size={15} />
              {t('download')}
            </a>
          )
        }
        meta={
          <span className={s.meta}>
            <ReplayResultBadge result={replay.result} />
            {mode && (
              <span className={s.mode}>
                <ModeIcon mode={mode} size={14} />
                {modeLabel}
              </span>
            )}
            {duration && <span>{t('duration', { duration })}</span>}
            {playedAt && <span>{playedAt}</span>}
            {replay.gameVersion && <GameVersionBadge version={replay.gameVersion} />}
            {replay.visibility !== 'public' && <Badge tone='steel'>{t(`visibility.${replay.visibility}`)}</Badge>}
          </span>
        }
        breadcrumbs={[{ label: t('breadcrumb'), href: ROUTES.replays.list }, { label: title }]}
        title={title}
      />
      <Card className={s.card} padding='md'>
        <div className={s.owner}>
          {vehicle && <TankLink image='small' vehicle={vehicle} />}
          {owner && (
            <span className={s.player}>
              <span className={s.label}>{t('recorder')}</span>
              <span className={s.nickname}>
                <Link href={ROUTES.players.profile(owner.nickname)}>{owner.nickname}</Link>
                {owner.clanTag && (
                  <Link className={s.clan} href={ROUTES.clans.detail(owner.clanTag)}>
                    [{owner.clanTag}]
                  </Link>
                )}
              </span>
            </span>
          )}
          <span className={s.views}>{t('views', { views: replay.views })}</span>
        </div>
        <KeyFigures>
          <KeyFigure label={t('figures.damage')} value={figures.damageDealt} />
          <KeyFigure label={t('figures.assist')} value={figures.damageAssisted} />
          <KeyFigure label={t('figures.blocked')} value={figures.damageBlocked} />
          <KeyFigure label={t('figures.frags')} value={figures.frags} />
          <KeyFigure label={t('figures.spotted')} value={figures.spotted} />
          <KeyFigure label={t('figures.xp')} value={figures.xp} />
        </KeyFigures>
        {replay.medals.length > 0 && (
          <div className={s.medals}>
            <span className={s.label}>{t('medals')}</span>
            {replay.medals.map((medal) => (
              <Badge key={medal} tone='premium'>
                {medal}
              </Badge>
            ))}
          </div>
        )}
        <ReplayOwnerActions />
      </Card>
    </>
  );
};
