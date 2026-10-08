import { Input, ScrollArea } from '@/ui-kit';

import type { TankPickerProps } from './TankPicker.types';

import { useTankSearch } from '../../../model/hooks/use-tank-search';
import { ModulePicker, TankEntry } from './components';

import s from './TankPicker.module.scss';

export const TankPicker = ({ state, onPick, onModules, onSearch }: TankPickerProps) => {
  const search = useTankSearch({ garage: state.garage, matches: state.matches, onSearch });
  const { labels } = state;

  return (
    <div className={s.picker}>
      <div className={s.panel}>
        <Input
          aria-label={labels.search}
          icon='search'
          placeholder={labels.search}
          value={search.text}
          variant='wide'
          onChange={(event) => search.change(event.currentTarget.value)}
          onEscape={search.clear}
        />
        <span className={s.heading}>{search.isSearching ? labels.search : labels.garage}</span>
        <div className={s.list}>
          <ScrollArea contain label={labels.garage}>
            {search.rows.map((row) => (
              <TankEntry key={row.cd} row={row} onPick={onPick} />
            ))}
          </ScrollArea>
        </div>
        {search.isEmpty && <span className={s.empty}>{labels.no_matches}</span>}
      </div>
      <ModulePicker labels={labels} modules={state.modules} onPick={onModules} />
    </div>
  );
};
