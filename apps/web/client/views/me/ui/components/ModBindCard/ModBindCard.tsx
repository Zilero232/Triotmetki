'use client';

import { Cpu, KeySquare } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { Button, QueryState, Skeleton } from '@/ui-kit';

import { MOD_BIND } from '../../../config';
import { useModBindCard } from '../../../model/hooks';
import { BindCodeDisplay } from '../BindCodeDisplay';
import { DeviceList } from '../DeviceList';
import { MeCard } from '../MeCard';
import { SectionError } from '../SectionError';

import s from './ModBindCard.module.scss';

export const ModBindCard = () => {
  const t = useTranslations('me.mod');
  const { code, steps, devicesQuery, isIssuing, isRetrying, revokingId, onIssue, onRetry, onRevoke } = useModBindCard();

  return (
    <MeCard description={t('description')} icon={<Cpu size={18} />} title={t('title')}>
      {code ? (
        <BindCodeDisplay code={code} onRenew={onIssue} />
      ) : (
        <Button block disabled={isIssuing} onClick={onIssue}>
          <KeySquare size={16} />
          {t('issue')}
        </Button>
      )}
      <ol className={s.steps}>
        {steps.map((step, index) => (
          <li key={step} className={s.step}>
            <span className={s.number}>{index + 1}</span>
            {t(`steps.${step}`)}
          </li>
        ))}
      </ol>
      <QueryState
        errorState={<SectionError isRetrying={isRetrying} onRetry={onRetry} />}
        query={devicesQuery}
        skeleton={<Skeleton count={MOD_BIND.skeletonRows} height={MOD_BIND.rowHeight} shape='block' />}
      >
        {(devices) => <DeviceList devices={devices} revokingId={revokingId} onRevoke={onRevoke} />}
      </QueryState>
    </MeCard>
  );
};
