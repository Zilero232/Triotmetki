'use client';

import { ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { Badge, buttonVariants, PageHeader } from '@/ui-kit';

import type { ArmorHeaderProps } from './ArmorHeader.types';

import s from './ArmorHeader.module.scss';

export const ArmorHeader = ({ slug, name, version, client, children }: ArmorHeaderProps) => {
  const t = useTranslations('armor.page');
  const tNav = useTranslations('nav');

  return (
    <PageHeader
      actions={
        <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={ROUTES.tanks.detail(slug)}>
          <ArrowLeft aria-hidden size={16} />
          {t('back')}
        </Link>
      }
      breadcrumbs={[
        { label: tNav('groups.vehicles'), href: ROUTES.tanks.list },
        ...(name ? [{ label: name, href: ROUTES.tanks.detail(slug) }] : []),
        { label: t('eyebrow') }
      ]}
      meta={
        version &&
        client && (
          <Badge className={s.version} data-testid='armor-source-badge' title={t('sourceTitle', { client })} tone='steel'>
            {t('source', { version, client })}
          </Badge>
        )
      }
      title={name ?? t('fallbackTitle')}
    >
      {children}
    </PageHeader>
  );
};
