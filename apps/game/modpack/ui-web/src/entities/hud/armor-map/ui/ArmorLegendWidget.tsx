import clsx from 'clsx';

import { HudPlate, toneClass } from '@/ui-kit';

import type { ArmorLegendWidgetProps } from './ArmorLegendWidget.types';

import { LegendChoices, LegendReadout, LegendScale } from './components';

import s from './ArmorLegendWidget.module.scss';

export const ArmorLegendWidget = ({ data }: ArmorLegendWidgetProps) => (
  <HudPlate>
    <div className={s.legend}>
      <div className={s.header}>
        <span className={s.title}>{data.title}</span>
        <span className={s.tank}>{data.tank}</span>
      </div>
      <LegendChoices attacker={data.attacker} modes={data.modes} shells={data.shells} />
      <LegendScale kinds={data.kinds} mode={data.mode} scale={data.scale} unit={data.unit} />
      <span className={clsx(s.status, toneClass(data.status_tone))}>{data.status}</span>
      {data.readout && <LegendReadout readout={data.readout} />}
      <span className={s.hint}>{data.hint}</span>
    </div>
  </HudPlate>
);
