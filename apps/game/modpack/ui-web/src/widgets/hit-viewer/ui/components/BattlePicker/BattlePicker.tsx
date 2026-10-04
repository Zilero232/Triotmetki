import clsx from 'clsx';
import { useState } from 'react';

import type { BattleLineProps, BattlePickerProps } from './BattlePicker.types';

import s from './BattlePicker.module.scss';

const BattleLine = ({ battle }: BattleLineProps) => (
  <>
    <span className={s.map}>{battle.map}</span>
    <span className={s.meta}>{`${battle.vehicle} · ${battle.date}`}</span>
  </>
);

export const BattlePicker = ({ battles, current, label, onPick }: BattlePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);

  const pick = (id: string): void => {
    setIsOpen(false);
    onPick(id);
  };

  return (
    <div className={s.picker}>
      <button aria-expanded={isOpen} aria-label={label} className={s.battle} type='button' onClick={() => setIsOpen(!isOpen)}>
        <BattleLine battle={current} />
      </button>
      {isOpen && (
        <div className={s.list}>
          {battles.map((battle) => (
            <button
              key={battle.id}
              className={clsx(s.battle, s.entry, battle.id === current.id && s.entryOn)}
              type='button'
              onClick={() => pick(battle.id)}
            >
              <BattleLine battle={battle} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
