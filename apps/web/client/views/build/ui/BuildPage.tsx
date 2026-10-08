'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { useRouteParam } from '@/shared/lib';
import { PageHeader } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import { useBuildData } from '../model/hooks';
import { BuildProvider, BuildScreen, BuildSkeleton } from './components';

import s from './BuildPage.module.scss';

export const BuildPage = () => {
  const t = useTranslations('builds.missing');
  const tNav = useTranslations('nav.items');
  const slug = useRouteParam('tank');
  const query = useBuildData(slug);

  return (
    <div className={s.root}>
      <ResourceGate
        back={{ href: ROUTES.builds.list, label: t('back') }}
        error={{ title: t('errorTitle'), description: t('errorDescription') }}
        header={<PageHeader breadcrumbs={[{ label: tNav('builds'), href: ROUTES.builds.list }, { label: slug }]} title={slug} />}
        notFound={{ title: t('notFoundTitle'), description: t('notFoundDescription', { slug }) }}
        query={query}
        skeleton={<BuildSkeleton />}
      >
        {({ vehicle, options }) => (
          <BuildProvider key={vehicle.tankId} options={options} vehicle={vehicle}>
            <BuildScreen />
          </BuildProvider>
        )}
      </ResourceGate>
    </div>
  );
};
