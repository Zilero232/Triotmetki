'use client';

import { BarChart3, CalendarDays, Check, Film, PenLine, Share2 } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { CompareToggle } from '@/features/compare/compare-selection';
import { FavoriteButton } from '@/features/player/toggle-favorite';
import { WatchButton } from '@/features/player/watch-player';
import { Link } from '@/shared/i18n/navigation';
import { ActionStrip, Button, buttonVariants } from '@/ui-kit';

import { useProfileActions } from '../../../model/hooks';

export const ProfileActionStrip = () => {
  const t = useTranslations('profile.actions');
  const tNav = useTranslations('nav.items');
  const { accountId, nickname, copied, share, signatureHref, replaysHref, wrappedHref, analyticsHref } = useProfileActions();

  return (
    <ActionStrip
      end={
        <>
          <FavoriteButton kind='player' targetId={accountId} />
          <WatchButton accountId={accountId} />
        </>
      }
      start={
        <>
          <CompareToggle entry={{ kind: 'player', item: { accountId, nickname } }} variant='button' />
          <Button size='sm' variant='secondary' onClick={share}>
            {copied ? <Check aria-hidden size={16} /> : <Share2 aria-hidden size={16} />}
            {t('share')}
          </Button>
          <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={signatureHref}>
            <PenLine aria-hidden size={16} />
            {t('signature')}
          </Link>
          <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={replaysHref}>
            <Film aria-hidden size={16} />
            {tNav('replays')}
          </Link>
          {wrappedHref && (
            <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={wrappedHref}>
              <CalendarDays aria-hidden size={16} />
              {t('wrapped')}
            </Link>
          )}
          {analyticsHref && (
            <Link className={buttonVariants({ variant: 'primary', size: 'sm' })} href={analyticsHref}>
              <BarChart3 aria-hidden size={16} />
              {t('myAnalytics')}
            </Link>
          )}
        </>
      }
      aria-label={t('label')}
      role='toolbar'
    />
  );
};
