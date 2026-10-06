import { REPLAY_FILTER } from '@/entities/replay/replay';

import type { FilterBarProps } from './FilterBar.types';

import { filterOptions } from '../../../lib/filter-options';
import { useReplaysT } from '../../../model/hooks';
import { Dropdown } from '../Dropdown';
import { ToolbarTools } from '../Toolbar/components';

import s from './FilterBar.module.scss';

export const FilterBar = ({ browser }: FilterBarProps) => {
  const t = useReplaysT();
  const { filters, patch } = browser;
  const options = filterOptions({ facets: browser.facets, t });

  return (
    <div className={s.bar}>
      <Dropdown active={filters.map !== null} label={t('filterMap')} options={options.maps} value={filters.map} onSelect={(map) => patch({ map })} />
      <Dropdown
        active={filters.vehicle !== null}
        label={t('filterVehicle')}
        options={options.vehicles}
        value={filters.vehicle}
        onSelect={(vehicle) => patch({ vehicle })}
      />
      <Dropdown
        active={filters.nation !== null}
        label={t('filterNation')}
        options={options.nations}
        value={filters.nation}
        onSelect={(nation) => patch({ nation })}
      />
      <Dropdown
        active={filters.tier !== null}
        label={t('filterTier')}
        options={options.tiers}
        value={filters.tier}
        onSelect={(tier) => patch({ tier })}
      />
      <Dropdown
        active={filters.type !== null}
        label={t('filterType')}
        options={options.types}
        value={filters.type}
        onSelect={(type) => patch({ type })}
      />
      <Dropdown
        active={filters.period !== REPLAY_FILTER.all}
        label={t('filterPeriod')}
        options={options.periods}
        value={filters.period}
        onSelect={(period) => patch({ period })}
      />
      {browser.activeFilters > 0 && (
        <button className={s.reset} type='button' onClick={browser.reset}>
          {t('resetFilters')}
          <span className={s.resetCount}>{browser.activeFilters}</span>
        </button>
      )}
      <ToolbarTools browser={browser} />
    </div>
  );
};
