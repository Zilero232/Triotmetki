'use client';

import { useTranslations } from 'next-intl';
import Image from 'next/image';

import { ROUTES } from '@/shared/constants';
import { Card, CardBody, CardHeader, CopyField, EmptyState, PageHeader, Skeleton } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import type { PlayerSignaturePageProps } from './PlayerSignaturePage.types';

import { SIGNATURE_IMAGE } from '../config';
import { useSignaturePage } from '../model/hooks';

import s from './PlayerSignaturePage.module.scss';

export const PlayerSignaturePage = ({ nickname: requested }: PlayerSignaturePageProps) => {
  const t = useTranslations('profile.signature');
  const tPlayers = useTranslations('players.head');
  const { nickname, links, snippets, query, isImageBroken, onImageError } = useSignaturePage(requested);

  return (
    <div className={s.root}>
      <PageHeader
        breadcrumbs={[
          { label: tPlayers('title'), href: ROUTES.players.list },
          { label: nickname, href: ROUTES.players.profile(nickname) },
          { label: t('crumb') }
        ]}
        description={t('description')}
        title={t('title', { nickname })}
      />
      <ResourceGate
        error={{ title: t('errorTitle') }}
        notFound={{ title: t('notFound', { nickname }) }}
        query={query}
        skeleton={<Skeleton height={320} shape='block' />}
      >
        {links && (
          <>
            <Card padding='none'>
              <CardHeader meta={t('refresh', { minutes: SIGNATURE_IMAGE.refreshMinutes })} title={t('preview')} />
              <CardBody className={s.preview}>
                {isImageBroken ? (
                  <EmptyState isCompact title={t('imageFailed')} />
                ) : (
                  <Image
                    unoptimized
                    alt={t('alt', { nickname })}
                    className={s.image}
                    fetchPriority='high'
                    height={SIGNATURE_IMAGE.height}
                    loading='eager'
                    src={links.imageUrl}
                    width={SIGNATURE_IMAGE.width}
                    onError={onImageError}
                  />
                )}
              </CardBody>
            </Card>
            <Card padding='none'>
              <CardHeader title={t('codes')} />
              <CardBody className={s.codes}>
                {snippets.map(({ id, value }) => (
                  <CopyField key={id} label={t(`snippets.${id}`)} value={value} />
                ))}
              </CardBody>
            </Card>
          </>
        )}
      </ResourceGate>
    </div>
  );
};
