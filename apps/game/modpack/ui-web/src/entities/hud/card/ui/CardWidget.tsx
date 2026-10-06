import clsx from 'clsx';

import { rem } from '@/shared/lib/css-unit';
import { HudPlate, HudText } from '@/ui-kit';

import type { CardWidgetProps } from './CardWidget.types';

import { CardChips, CardHeader, CardRow, CardStrip } from './components';

import s from './CardWidget.module.scss';

export const CardWidget = ({ data }: CardWidgetProps) => (
  <HudPlate className={data.title === null ? s.battle : s.hangar}>
    <div className={clsx(s.box, data.title !== null && s.wide)} style={data.width === null ? undefined : { width: rem(data.width) }}>
      <CardHeader data={data} />
      {data.chips.length > 0 && <CardChips chips={data.chips} />}
      {data.strip.length > 0 && <CardStrip marks={data.strip} />}
      {data.rows.map((row, index) => (
        <CardRow key={`${String(index)}-${row.text ?? row.label ?? ''}`} row={row} />
      ))}
      <HudText className={s.footer} text={data.footer} />
    </div>
  </HudPlate>
);
