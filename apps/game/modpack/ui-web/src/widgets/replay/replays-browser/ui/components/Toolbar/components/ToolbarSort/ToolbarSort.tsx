import { useTooltip } from '@/shared/lib/use-tooltip';
import { Icon } from '@/ui-kit';

import type { ToolbarProps } from '../../Toolbar.types';

import { sortOptions } from '../../../../../lib/filter-options';
import { useReplaysT } from '../../../../../model/hooks';
import { Dropdown } from '../../../Dropdown';

import s from './ToolbarSort.module.scss';

export const ToolbarSort = ({ browser }: ToolbarProps) => {
  const t = useReplaysT();
  const { sort, descending } = browser.filters;
  const directionLabel = descending ? t('descending') : t('ascending');
  const directionTip = useTooltip(directionLabel);

  return (
    <div className={s.sort}>
      <Dropdown label={t('sortBy')} options={sortOptions(t)} value={sort} onSelect={browser.sortBy} />
      <button aria-label={directionLabel} className={s.direction} type='button' onClick={() => browser.sortBy(sort)} {...directionTip}>
        <Icon name={descending ? 'arrow-down' : 'arrow-up'} size={14} tone='text' />
      </button>
    </div>
  );
};
