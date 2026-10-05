import clsx from 'clsx';

import { ClientIcon, HudPlate, MiniBar, toneClass } from '@/ui-kit';

import type { BattleSummaryWidgetProps } from './BattleSummaryWidget.types';

import { BATTLE_SUMMARY } from '../config';

import s from './BattleSummaryWidget.module.scss';

export const BattleSummaryWidget = ({ data }: BattleSummaryWidgetProps) => (
  <div key={data.card} className={s.card} style={{ animationDuration: `${String(data.show_s)}${BATTLE_SUMMARY.secondUnit}` }}>
    <HudPlate className={s.plate}>
      <div className={s.header}>
        <span className={s.title}>{data.title}</span>
        {data.result !== null && <span className={clsx(s.result, toneClass(data.result_tone))}>{data.result}</span>}
      </div>
      {data.subtitle !== null && <span className={s.subtitle}>{data.subtitle}</span>}
      <div className={s.tiles}>
        {data.tiles.map((tile) => (
          <div key={tile.label} className={s.tile}>
            <div className={s.figure}>
              <ClientIcon icon={tile.icon} size={BATTLE_SUMMARY.tileIconSize} tone={tile.tone} />
              <span className={clsx(s.value, toneClass(tile.tone))}>{tile.value}</span>
            </div>
            <span className={s.label}>{tile.label}</span>
          </div>
        ))}
      </div>
      {data.rows.map((row) => (
        <div key={row.text} className={s.row}>
          <div className={s.line}>
            <ClientIcon icon={row.icon} size={BATTLE_SUMMARY.rowIconSize} tone='muted' />
            <span className={s.text}>{row.text}</span>
            <span className={clsx(s.amount, toneClass(row.tone))}>{row.value}</span>
            {row.note !== null && <span className={clsx(s.note, toneClass(row.tone))}>{row.note}</span>}
          </div>
          {row.progress !== null && (
            <MiniBar height={BATTLE_SUMMARY.bar.height} max={1} tone={row.progress_tone} value={row.progress} width={BATTLE_SUMMARY.bar.width} />
          )}
        </div>
      ))}
    </HudPlate>
  </div>
);
