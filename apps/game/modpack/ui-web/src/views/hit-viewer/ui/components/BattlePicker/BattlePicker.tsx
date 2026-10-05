import clsx from 'clsx';

import type { BattleLineProps, BattlePickerProps } from './BattlePicker.types';

import { useBattlePicker } from '../../../model/hooks/use-battle-picker';

import s from './BattlePicker.module.scss';

const BattleLine = ({ battle }: BattleLineProps) => (
  <>
    <span className={s.map}>{battle.map}</span>
    <span className={s.meta}>{`${battle.vehicle} · ${battle.date}`}</span>
  </>
);

export const BattlePicker = ({ battles, current, label, onPick }: BattlePickerProps) => {
  const picker = useBattlePicker(onPick);

  return (
    <div className={s.picker}>
      <button aria-expanded={picker.isOpen} aria-label={label} className={s.battle} type='button' onClick={picker.toggle}>
        <BattleLine battle={current} />
      </button>
      {picker.isOpen && (
        <div ref={picker.listRef} className={s.list}>
          {battles.map((battle) => (
            <button
              key={battle.id}
              className={clsx(s.battle, s.entry, battle.id === current.id && s.entryOn)}
              type='button'
              onClick={() => picker.pick(battle.id)}
            >
              <BattleLine battle={battle} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
