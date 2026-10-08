'use client';

import { useFormatter, useTranslations } from 'next-intl';
import { match, P } from 'ts-pattern';

import { ROUTES } from '@/shared/constants';
import { Link } from '@/shared/i18n/navigation';
import { buttonVariants, EmptyState, ErrorState, Skeleton } from '@/ui-kit';

import type { MoeResultsProps } from '../../MoeCalculator.types';

import { useMoeProjection } from '../../../../../model/hooks';
import { ResultFigure } from '../../../ResultFigure';

export const MoeResults = (props: MoeResultsProps) => {
  const t = useTranslations('tools.moe');
  const format = useFormatter();
  const { hasVehicle, isFetching, isError, projection, targetPercent, retry } = useMoeProjection(props);

  const link = (
    <Link className={buttonVariants({ variant: 'secondary', size: 'sm' })} href={`${ROUTES.marks}#projection`}>
      {t('openMarks')}
    </Link>
  );

  return match({ hasVehicle, isFetching, isError, projection })
    .with({ hasVehicle: false }, () => <EmptyState isCompact action={link} title={t('pickTitle')} />)
    .with({ isFetching: true, projection: null }, () => <Skeleton height={120} width='100%' />)
    .with({ isError: true }, () => <ErrorState isCompact onRetry={retry} />)
    .with({ projection: P.nonNullable }, ({ projection: { battles, targetEma } }) => (
      <>
        <ResultFigure
          fallback={t('unreachable')}
          hint={t('hint', { damage: format.number(Math.ceil(targetEma)), percent: targetPercent })}
          label={t('battles')}
          tone={battles === null ? 'bad' : 'neutral'}
          value={battles}
        />
        {link}
      </>
    ))
    .otherwise(() => <EmptyState isCompact action={link} title={t('noData')} />);
};
