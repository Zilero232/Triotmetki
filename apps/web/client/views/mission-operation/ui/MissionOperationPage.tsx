'use client';

import { useTranslations } from 'next-intl';

import { ROUTES } from '@/shared/constants';
import { DataSourceNote, PageHeader, PageHeaderSkeleton } from '@/ui-kit';
import { ResourceGate } from '@/widgets/site/resource-missing';

import { useOperationDetail } from '../model/hooks';
import { BranchBoard, MissionDetail, MissionPlan, OperationHeader, OperationSkeleton } from './components';

import s from './MissionOperationPage.module.scss';

export const MissionOperationPage = () => {
  const t = useTranslations('missions');
  const tNav = useTranslations('nav.items');
  const detail = useOperationDetail();

  return (
    <div className={s.root}>
      <ResourceGate
        skeleton={
          <>
            <PageHeaderSkeleton />
            <OperationSkeleton />
          </>
        }
        back={{ href: ROUTES.missions.hub, label: t('operation.back') }}
        error={{ title: t('operation.errorTitle'), description: t('operation.errorDescription') }}
        header={<PageHeader breadcrumbs={[{ label: tNav('missions'), href: ROUTES.missions.hub }]} title={tNav('missions')} />}
        notFound={{ title: t('operation.notFoundTitle'), description: t('operation.notFoundDescription') }}
        query={detail}
      >
        {(data) => (
          <>
            <OperationHeader data={data} />
            <BranchBoard />
            <MissionDetail />
            <MissionPlan operation={data.operation.operationId} />
          </>
        )}
      </ResourceGate>
      <DataSourceNote />
    </div>
  );
};
