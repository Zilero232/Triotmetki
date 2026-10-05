import type { MergeCollectorStateInput } from './collector-state.types';

export const mergeCollectorState = ({ db, key, value }: MergeCollectorStateInput) =>
  db
    .insertInto('collector_state')
    .values((eb) => ({ key, value: eb.cast(eb.val(JSON.stringify(value)), 'jsonb'), updated_at: eb.fn('now') }))
    .onConflict((conflict) =>
      conflict.column('key').doUpdateSet((eb) => ({
        value: eb(eb.ref('collector_state.value'), '||', eb.ref('excluded.value')),
        updated_at: eb.fn('now')
      }))
    )
    .execute();
