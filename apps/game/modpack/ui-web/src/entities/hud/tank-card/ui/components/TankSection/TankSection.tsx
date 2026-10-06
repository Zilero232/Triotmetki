import type { TankSectionProps } from './TankSection.types';

import { TankCell } from '../TankCell';

import s from './TankSection.module.scss';

export const TankSection = ({ section }: TankSectionProps) => (
  <div className={s.section}>
    <div className={s.title}>
      <span className={s.titleText}>{section.title}</span>
      <span className={s.rule} />
    </div>
    <div className={s.grid}>
      {section.cells.map((cell, index) => (
        <TankCell key={cell.label} cell={cell} isStart={index % 2 === 0} />
      ))}
    </div>
  </div>
);
