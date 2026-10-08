'use client';

import { LogIn } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { match } from 'ts-pattern';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, EmptyState, ErrorState, PageHero, SkeletonStack } from '@/ui-kit';

import type { SocialShellProps } from './SocialShell.types';

import { SOCIAL_SHELL } from '../../config';
import { useSocialShell } from '../../model/hooks';
import { SocialNav } from './components';

import s from './SocialShell.module.scss';

export const SocialShell = ({ section, figures, children }: SocialShellProps) => {
  const t = useTranslations('social.shell');
  const tNav = useTranslations('nav.items');
  const { state, loginHref, current, isRetrying, retry } = useSocialShell(section);

  return (
    <div className={s.root}>
      <PageHero
        art={{ kind: 'emblem', glyph: <current.icon size={SOCIAL_SHELL.emblemSize} strokeWidth={SOCIAL_SHELL.emblemStroke} /> }}
        breadcrumbs={[{ label: tNav('leagues'), href: ROUTES.social.leagues }, { label: t(`sections.${section}.title`) }]}
        figures={state.isSignedIn ? figures : undefined}
        lead={t(`sections.${section}.lead`)}
        title={t(`sections.${section}.title`)}
      />
      <div className={s.body}>
        <SocialNav section={section} />
        {match(state)
          .with({ isPending: true }, () => <SkeletonStack className={s.skeleton} heights={SOCIAL_SHELL.skeletonHeights} />)
          .with({ isFailed: true }, () => <ErrorState isRetrying={isRetrying} onRetry={retry} />)
          .with({ isSignedIn: false }, () => (
            <EmptyState
              action={
                <Link className={buttonVariants({ variant: 'primary', size: 'sm' })} href={loginHref}>
                  <LogIn aria-hidden size={14} />
                  {t('signIn')}
                </Link>
              }
              description={t(`sections.${section}.guestText`)}
              icon={<current.icon aria-hidden size={28} />}
              title={t(`sections.${section}.guestTitle`)}
            />
          ))
          .otherwise(() => children)}
      </div>
    </div>
  );
};
