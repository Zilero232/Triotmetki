'use client';

import { ClipboardList, Film } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { ClanEmblem } from '@/entities/clan/clan';
import { ratingValueTone, winRateTone } from '@/entities/player/stats';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, KeyFigure, KeyFigures, PageHeader } from '@/ui-kit';

import type { ClanHeaderProps } from './ClanHeader.types';

import { useWorkspaceLink } from '../../../model/hooks';

import s from './ClanHeader.module.scss';

export const ClanHeader = ({ page: { clan, stats, members } }: ClanHeaderProps) => {
  const t = useTranslations('clans.clan');
  const tNav = useTranslations('clans.head');
  const tSiteNav = useTranslations('nav.items');
  const format = useFormatter();
  const workspaceHref = useWorkspaceLink({ clan, members });

  return (
    <div className={s.root} style={{ '--clan-color': clan.color ?? undefined }}>
      <ClanEmblem className={s.emblem} color={clan.color} size='lg' src={clan.emblem} tag={clan.tag} />
      <PageHeader
        actions={
          <>
            <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.replays.filtered({ clan: clan.tag })}>
              <Film aria-hidden size={16} />
              {tSiteNav('replays')}
            </Link>
            {workspaceHref && (
              <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={workspaceHref}>
                <ClipboardList aria-hidden size={16} />
                {t('workspace')}
              </Link>
            )}
          </>
        }
        meta={
          <span className={s.meta}>
            {clan.createdAt && t('founded', { date: format.dateTime(new Date(clan.createdAt), { dateStyle: 'long' }) })}
            {clan.createdAt && ' · '}
            {stats.activeMembers7d === null
              ? t('members', { count: clan.membersCount })
              : t('activeShort', { active: stats.activeMembers7d, total: clan.membersCount })}
          </span>
        }
        title={
          <>
            <span className={s.tag}>[{clan.tag}]</span> {clan.name}
          </>
        }
        breadcrumbs={[{ label: tNav('title'), href: ROUTES.clans.list }, { label: `[${clan.tag}]` }]}
        description={clan.motto ?? undefined}
      >
        <KeyFigures>
          <KeyFigure
            format={{ maximumFractionDigits: 2 }}
            label={t('stats.winRate')}
            suffix='%'
            tone={winRateTone(stats.avgWinRate)}
            value={stats.avgWinRate}
          />
          <KeyFigure format={{ maximumFractionDigits: 0 }} label={t('stats.wn8')} tone={ratingValueTone(stats.avgWn8)} value={stats.avgWn8.value} />
          <KeyFigure format={{ maximumFractionDigits: 1 }} label={t('stats.battlesPerDay')} value={stats.avgBattlesPerDay} />
          <KeyFigure label={t('stats.stronghold')} value={stats.strongholdLevel} />
          <KeyFigure label={t('stats.provinces')} value={stats.provincesCount} />
          <KeyFigure label={t('stats.elo')} value={stats.eloRating10} />
        </KeyFigures>
      </PageHeader>
    </div>
  );
};
