'use client';

import { X } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { PlayerIdentity } from '@/entities/player/player';
import { ratingValueTone } from '@/entities/player/stats';
import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { IconButton, RetryButton, Skeleton } from '@/ui-kit';

import type { PlayerSlotProps } from './PlayerSlot.types';

import { usePlayerSlot } from '../../../model/hooks';

import s from './PlayerSlot.module.scss';

export const PlayerSlot = ({ accountId, index, onRemove }: PlayerSlotProps) => {
  const t = useTranslations('compare');
  const format = useFormatter();
  const { summary, isError, canRetry, isRetrying, retry } = usePlayerSlot(accountId);

  return (
    <article className={s.root} data-slot={index}>
      <div className={s.body}>
        {isError && (
          <span className={s.error}>
            {t('slotError', { id: accountId })}
            {canRetry && <RetryButton disabled={isRetrying} size='sm' variant='ghost' onClick={retry} />}
          </span>
        )}
        {!summary && !isError && <Skeleton height={20} width='60%' />}
        {summary && (
          <>
            <Link className={s.player} href={ROUTES.players.profile(summary.nickname)}>
              <PlayerIdentity player={{ nickname: summary.nickname, clanTag: summary.clan?.tag ?? null }} />
            </Link>
            <span className={s.figure}>
              <span className={s.label}>{t('broneIndex')}</span>
              <span className={s.value} data-tone={ratingValueTone(summary.overall.broneIndex)}>
                {summary.overall.broneIndex.value === null ? '—' : format.number(summary.overall.broneIndex.value, 'integer')}
              </span>
            </span>
          </>
        )}
      </div>
      <IconButton aria-label={t('removeNamed', { name: summary?.nickname ?? `#${accountId}` })} size='sm' onClick={onRemove}>
        <X size={14} />
      </IconButton>
    </article>
  );
};
