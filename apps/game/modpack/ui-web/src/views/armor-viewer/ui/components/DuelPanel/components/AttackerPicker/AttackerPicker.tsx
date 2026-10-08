import clsx from 'clsx';

import { Icon, ScrollArea } from '@/ui-kit';

import type { AttackerPickerProps } from './AttackerPicker.types';

import { tierLabel } from '../../../../../lib/fill-label';
import { useAttackerMenu } from '../../../../../model/hooks/use-attacker-menu';

import s from './AttackerPicker.module.scss';

export const AttackerPicker = ({ state, onPick }: AttackerPickerProps) => {
  const menu = useAttackerMenu(onPick);
  const { labels, attacker, attackers, tank } = state;

  return (
    <div className={s.picker}>
      <button
        aria-expanded={menu.isOpen}
        aria-label={labels.attacker}
        className={clsx(s.trigger, menu.isOpen && s.triggerOpen)}
        type='button'
        onClick={menu.toggle}
      >
        <span className={s.caption}>{labels.attacker}</span>
        <span className={s.name}>{attacker ? attacker.name : ''}</span>
        <span className={s.chevron}>
          <Icon name={menu.isOpen ? 'chevron-up' : 'chevron-down'} size={12} tone='muted' />
        </span>
      </button>
      {menu.isOpen && (
        <div className={s.menu}>
          {tank && (
            <button className={clsx(s.entry, attacker?.is_target && s.entryOn)} type='button' onClick={() => menu.pick(tank.cd)}>
              <span className={s.tier}>{tierLabel(tank.tier)}</span>
              {labels.this_tank}
            </button>
          )}
          <div className={s.list}>
            <ScrollArea contain label={labels.attacker}>
              {attackers.map((row) => (
                <button
                  key={row.cd}
                  className={clsx(s.entry, row.active && !attacker?.is_target && s.entryOn)}
                  type='button'
                  onClick={() => menu.pick(row.cd)}
                >
                  <span className={s.tier}>{tierLabel(row.tier)}</span>
                  {row.name}
                </button>
              ))}
            </ScrollArea>
          </div>
        </div>
      )}
    </div>
  );
};
