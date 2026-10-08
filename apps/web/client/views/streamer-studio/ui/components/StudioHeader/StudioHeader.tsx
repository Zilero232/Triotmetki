'use client';

import { ExternalLink } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, SectionHeader } from '@/ui-kit';

import { useStreamerProfile } from '../../../model/hooks';

export const StudioHeader = () => {
  const t = useTranslations('streamer.studio');
  const { data: profile } = useStreamerProfile();

  return (
    <SectionHeader
      action={
        profile && (
          <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.streamers.profile(profile.slug)}>
            <ExternalLink size={14} />
            {t('openPublic')}
          </Link>
        )
      }
      as='h1'
      description={t('lead')}
      title={t('title')}
    />
  );
};
