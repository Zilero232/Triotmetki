'use client';

import { Star, Trash2, User } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Badge, IconButton, QueryState, Skeleton } from '@/ui-kit';

import { CARD_SKELETON } from '../../../config';
import { useFavoritesCard } from '../../../model/hooks';
import { MeCard } from '../MeCard';
import { SectionError } from '../SectionError';

import s from './FavoritesCard.module.scss';

export const FavoritesCard = () => {
  const t = useTranslations('me.favorites');
  const { query, isRetrying, isRemoving, onRetry, onRemove } = useFavoritesCard();

  return (
    <MeCard description={t('description')} icon={<Star size={18} />} title={t('title')}>
      <QueryState
        skeleton={
          <div className={s.list}>
            <Skeleton count={CARD_SKELETON.favorites.rows} height={CARD_SKELETON.favorites.height} shape='block' />
          </div>
        }
        empty={<p className={s.empty}>{t('empty')}</p>}
        errorState={<SectionError isRetrying={isRetrying} onRetry={onRetry} />}
        query={query}
      >
        {(favorites) => (
          <ul className={s.list}>
            {favorites.map(({ id, kind, title, label, isOwn, targetId }) => (
              <li key={id} className={s.row}>
                <User className={s.kind} size={14} />
                {kind === 'player' && title ? (
                  <Link className={s.name} href={ROUTES.players.profile(title)}>
                    {title}
                  </Link>
                ) : (
                  <span className={s.name}>{title ?? `#${targetId}`}</span>
                )}
                {label && <span className={s.label}>{label}</span>}
                {isOwn && <Badge tone='accent'>{t('own')}</Badge>}
                <IconButton aria-label={t('remove')} disabled={isRemoving} size='sm' onClick={() => onRemove(id)}>
                  <Trash2 size={14} />
                </IconButton>
              </li>
            ))}
          </ul>
        )}
      </QueryState>
    </MeCard>
  );
};
