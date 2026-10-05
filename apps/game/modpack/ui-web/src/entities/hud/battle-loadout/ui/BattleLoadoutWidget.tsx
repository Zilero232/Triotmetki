import clsx from 'clsx';

import { ClientIcon, Glyph, HudTip } from '@/ui-kit';

import type { BattleLoadoutData, EquipmentItem } from '../model/schemas';
import type { BattleLoadoutWidgetProps } from './BattleLoadoutWidget.types';

import { BATTLE_LOADOUT } from '../config';
import { loadoutEntries } from '../lib/loadout-view';
import { useItemTooltip } from '../model/hooks';

import s from './BattleLoadoutWidget.module.scss';

const cellClassName = (item: EquipmentItem): string =>
  clsx(s.cell, item.empty && s.empty, item.bonus && s.bonus, item.boosted && s.boosted, item.active && s.active, item.used && s.used);

const cellStyle = ({ cell, gap }: BattleLoadoutData) => ({
  width: `${String(cell)}rem`,
  height: `${String(cell)}rem`,
  margin: `0 ${String(gap / 2)}rem`
});

export const BattleLoadoutWidget = ({ data }: BattleLoadoutWidgetProps) => {
  const { tip, handlers } = useItemTooltip(data.items);

  return (
    <div className={s.root}>
      {tip && (
        <HudTip
          className={s.tip}
          mark={tip.bonus && <Glyph name={BATTLE_LOADOUT.bonusGlyph} size={BATTLE_LOADOUT.bonusSize} tone='gold' />}
          text={tip.effect}
          title={tip.name}
        />
      )}
      <div className={s.row}>
        {loadoutEntries(data.items).map((entry) =>
          entry.kind === 'divider' ? (
            <span key={entry.key} className={s.divider} style={{ height: `${String(data.cell)}rem` }} />
          ) : (
            <div key={entry.key} className={cellClassName(entry.item)} style={cellStyle(data)} {...(entry.item.empty ? {} : handlers(entry.index))}>
              {!entry.item.empty && <ClientIcon icon={entry.item.icon} size={data.size} tone='muted' />}
              {entry.item.overlay && <ClientIcon className={s.overlay} icon={entry.item.overlay} size={data.size} />}
              {entry.item.bonus && <Glyph className={s.star} name={BATTLE_LOADOUT.bonusGlyph} size={BATTLE_LOADOUT.bonusSize} tone='gold' />}
              {entry.item.attention && (
                <Glyph className={s.attention} name={BATTLE_LOADOUT.attentionGlyph} size={BATTLE_LOADOUT.attentionSize} tone='warning' />
              )}
            </div>
          )
        )}
      </div>
    </div>
  );
};
