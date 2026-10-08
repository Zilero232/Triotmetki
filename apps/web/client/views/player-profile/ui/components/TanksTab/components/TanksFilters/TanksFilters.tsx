'use client';

import type { Nation } from '@otmetki/icons';

import { NATION_ICONS, NATIONS, TANK_CLASSES } from '@otmetki/icons';
import { Search } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { FilterBar, FilterField, IconFilter, Input, SegmentedControl, Select, TierPicker } from '@/ui-kit';

import type { PremiumFilter } from '../../../../../lib/tanks-filter';
import type { TanksFiltersProps } from './TanksFilters.types';

import { TANKS_FILTER } from '../../../../../config';
import { useTanksFilterContext } from '../../../../../model/context';

import s from './TanksFilters.module.scss';

export const TanksFilters = ({ total }: TanksFiltersProps) => {
  const t = useTranslations('profile.tanks');
  const tGame = useTranslations('game');
  const { filter, activeCount, setTiers, setTypes, update, reset } = useTanksFilterContext();

  return (
    <FilterBar
      primary={
        <Input
          aria-label={t('search')}
          icon={<Search size={14} />}
          placeholder={t('search')}
          value={filter.query}
          wrapperClassName={s.search}
          onChange={(event) => update({ query: event.target.value })}
        />
      }
      actions={total !== null && <span className={s.total}>{t('total', { count: total })}</span>}
      activeCount={activeCount}
      onReset={reset}
    >
      <FilterField count={filter.tiers.length} label={t('tiersLabel')}>
        <TierPicker aria-label={t('tiersLabel')} value={filter.tiers} onChange={setTiers} />
      </FilterField>
      <FilterField count={filter.types.length} label={t('typesLabel')}>
        <IconFilter aria-label={t('typesLabel')} kind='class' options={TANK_CLASSES} value={filter.types} onChange={setTypes} />
      </FilterField>
      <FilterField label={t('nationLabel')} size='md'>
        <Select<'all' | Nation>
          items={[
            { value: 'all', label: t('allNations') },
            ...NATIONS.map((nation) => {
              const Icon = NATION_ICONS[nation];

              return { value: nation, label: tGame(`nations.${nation}`), icon: <Icon palette='color' size={16} /> };
            })
          ]}
          aria-label={t('nationLabel')}
          value={filter.nation}
          onValueChange={(nation) => update({ nation })}
        />
      </FilterField>
      <FilterField label={t('premiumLabel')}>
        <SegmentedControl<PremiumFilter>
          aria-label={t('premiumLabel')}
          options={TANKS_FILTER.premiumOptions.map((value) => ({ value, label: t(`premium.${value}`) }))}
          value={filter.premium}
          onChange={(premium) => update({ premium })}
        />
      </FilterField>
    </FilterBar>
  );
};
