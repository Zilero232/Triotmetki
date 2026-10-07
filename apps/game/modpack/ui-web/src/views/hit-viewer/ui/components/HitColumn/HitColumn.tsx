import type { HitColumnProps } from './HitColumn.types';

import { HitDetails } from '../HitDetails';
import { HitTable } from '../HitTable';
import { OutcomeFilter } from '../OutcomeFilter';

import s from './HitColumn.module.scss';

export const HitColumn = ({ state, filter, selectedRow, onPick }: HitColumnProps) => (
  <div className={s.column}>
    <div className={s.list}>
      {filter.total > 0 && (
        <OutcomeFilter
          counts={filter.counts}
          labels={state.labels}
          summary={state.summary ?? null}
          tone={filter.tone}
          total={filter.total}
          onPick={filter.pickTone}
        />
      )}
      <HitTable labels={state.labels} rows={filter.rows} selected={state.selected} onPick={onPick} />
    </div>
    {selectedRow && (
      <div className={s.details}>
        <HitDetails labels={state.labels} row={selectedRow} />
      </div>
    )}
  </div>
);
