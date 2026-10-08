'use client';

import { useTranslations } from 'next-intl';

import { TankPicker } from '@/features/tank/pick-tank';
import { RangeSlider, Switch } from '@/ui-kit';

import { ECONOMY } from '../../../config';
import { useEconomyCalculator } from '../../../model/hooks';
import { CalcShell } from '../CalcShell';
import { FieldGrid } from '../FieldGrid';
import { EconomyResults, EconomyShells, RealMedians } from './components';

export const EconomyCalculator = () => {
  const t = useTranslations('tools.economy');
  const { values, field, onTierChange, vehicle, onVehicleChange, medians, isMediansPending, isMediansError, isMediansRetrying, retryMedians } =
    useEconomyCalculator();

  return (
    <CalcShell
      inputs={
        <>
          <TankPicker label={t('tank')} placeholder={t('tankPlaceholder')} value={vehicle} onChange={onVehicleChange} />
          <RangeSlider
            {...ECONOMY.tierRange}
            label={t('tier')}
            value={values.tier}
            valueLabel={t('tierValue', { tier: values.tier })}
            onValueChange={onTierChange}
          />
          <Switch
            checked={values.isPremiumVehicle}
            description={t('premiumVehicleHint')}
            label={t('premiumVehicle')}
            onCheckedChange={field('isPremiumVehicle')}
          />
          <FieldGrid
            fields={[
              { key: 'damage', label: t('fields.damage'), ...ECONOMY.damageRange },
              { key: 'spotting', label: t('fields.spotting'), ...ECONOMY.damageRange },
              { key: 'standard', label: t('fields.standard'), ...ECONOMY.consumableRange },
              { key: 'premium', label: t('fields.premium'), ...ECONOMY.consumableRange }
            ]}
            field={field}
            values={values}
          />
          <EconomyShells field={field} values={values} />
        </>
      }
      results={
        <>
          <EconomyResults values={values} />
          <RealMedians
            isError={isMediansError}
            isPending={isMediansPending}
            isRetrying={isMediansRetrying}
            medians={medians}
            vehicle={vehicle}
            onRetry={retryMedians}
          />
        </>
      }
      description={t('description')}
      footer={t('footer')}
      title={t('title')}
    />
  );
};
