'use client';

import { Bot } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { QueryState, Skeleton } from '@/ui-kit';

import { CARD_SKELETON } from '../../../config';
import { useBotsCard } from '../../../model/hooks';
import { MeCard } from '../MeCard';
import { SectionError } from '../SectionError';
import { BotRow } from './components';

import s from './BotsCard.module.scss';

export const BotsCard = () => {
  const t = useTranslations('me.bots');
  const { query, rows, isRetrying, isBusy, onRetry, onLink, onUnlink } = useBotsCard();

  return (
    <MeCard description={t('description')} icon={<Bot size={18} />} title={t('title')}>
      <QueryState
        skeleton={
          <div className={s.list}>
            <Skeleton count={CARD_SKELETON.bots.rows} height={CARD_SKELETON.bots.height} shape='block' />
          </div>
        }
        errorState={<SectionError isRetrying={isRetrying} onRetry={onRetry} />}
        query={query}
      >
        {rows.length > 0 && (
          <ul className={s.list}>
            {rows.map((row) => (
              <BotRow key={row.provider} isBusy={isBusy} row={row} onLink={onLink} onUnlink={onUnlink} />
            ))}
          </ul>
        )}
      </QueryState>
    </MeCard>
  );
};
