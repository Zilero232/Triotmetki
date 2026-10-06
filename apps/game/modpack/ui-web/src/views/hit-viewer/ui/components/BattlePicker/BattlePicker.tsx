import clsx from 'clsx';

import { Icon, ScrollArea } from '@/ui-kit';

import type { BattlePickerProps } from './BattlePicker.types';

import { pickerListHeight } from '../../../lib/viewer-frame';
import { useBattlePicker } from '../../../model/hooks/use-battle-picker';
import { BattleCard } from './components/BattleCard';

import s from './BattlePicker.module.scss';

export const BattlePicker = ({ battles, current, label, labels, sideLabels, onPick }: BattlePickerProps) => {
  const picker = useBattlePicker(onPick);

  return (
    <div className={s.picker}>
      <button
        aria-expanded={picker.isOpen}
        aria-label={label}
        className={clsx(s.trigger, picker.isOpen && s.triggerOpen)}
        type='button'
        onClick={picker.toggle}
      >
        <BattleCard battle={current} labels={labels} sideLabels={sideLabels} />
        <span className={s.chevron}>
          <Icon name={picker.isOpen ? 'chevron-up' : 'chevron-down'} size={14} tone='muted' />
        </span>
      </button>
      {picker.isOpen && (
        <div className={s.list} style={{ height: pickerListHeight(battles.length) }}>
          <ScrollArea contain label={label}>
            {battles.map((battle) => (
              <button
                key={battle.id}
                aria-pressed={battle.id === current.id}
                className={clsx(s.entry, battle.id === current.id && s.entryOn)}
                type='button'
                onClick={() => picker.pick(battle.id)}
              >
                <BattleCard battle={battle} labels={labels} sideLabels={sideLabels} />
              </button>
            ))}
          </ScrollArea>
        </div>
      )}
    </div>
  );
};
