'use client';

import { clsx } from 'clsx';
import { useTranslations } from 'next-intl';

import { Card, CardHeader, QueryState, SegmentedControl, Skeleton } from '@/ui-kit';

import type { TankMathProps } from './TankMath.types';

import { TANK_MATH } from '../../config';
import { useTankMath } from '../../model/hooks';
import { BallisticsSection, HandlingSection, SpottingSection } from './components';

import s from './TankMath.module.scss';

export const TankMath = ({ tankId, id, className }: TankMathProps) => {
  const t = useTranslations('tankMath');
  const { query, config, other, preset, presets, setPreset } = useTankMath(tankId);

  return (
    <Card className={clsx(s.root, className)} id={id} padding='none'>
      <CardHeader
        action={<SegmentedControl aria-label={t('presets.label')} options={presets} size='sm' value={preset} onChange={setPreset} />}
        className={s.header}
        meta={config ? t('modules', { gun: config.modules.gun, turret: config.modules.turret }) : undefined}
        title={t('title')}
      />
      <QueryState query={query} skeleton={<Skeleton height={TANK_MATH.skeletonHeight} shape='block' width='100%' />}>
        {(data) =>
          config && (
            <div className={s.body}>
              <HandlingSection config={config} other={other} otherLabel={t(`presets.vs.${preset}`)} />
              <BallisticsSection config={config} />
              <SpottingSection data={data} preset={preset} />
              <p className={s.note}>{t('note')}</p>
            </div>
          )
        }
      </QueryState>
    </Card>
  );
};
