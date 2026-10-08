import { useTranslations } from 'next-intl';

import { PageHeroFallback, Skeleton } from '@/ui-kit';

import { PROFILE_SKELETON } from '../../../config';

import s from './ProfileSkeleton.module.scss';

export const ProfileSkeleton = () => {
  const t = useTranslations('profile');

  return (
    <div aria-label={t('loading')} role='status'>
      <PageHeroFallback hasActionStrip>
        <Skeleton height={PROFILE_SKELETON.tabsHeight} shape='block' />
        <div className={s.grid}>
          <Skeleton count={PROFILE_SKELETON.panels} height={PROFILE_SKELETON.panelHeight} shape='block' />
        </div>
      </PageHeroFallback>
    </div>
  );
};
