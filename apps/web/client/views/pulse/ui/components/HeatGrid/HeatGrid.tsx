import { useTranslations } from 'next-intl';

import type { HeatGridProps } from './HeatGrid.types';

import { PULSE } from '../../../config';

import s from './HeatGrid.module.scss';

export const HeatGrid = ({ rows }: HeatGridProps) => {
  const t = useTranslations('pulse.heat');

  return (
    <div className={s.scroller}>
      <table className={s.grid}>
        <caption className={s.caption}>{t('caption')}</caption>
        <thead>
          <tr>
            <th className={s.corner} scope='col'>
              <span className={s.caption}>{t('day')}</span>
            </th>
            {rows[0]?.cells.map((cell) => (
              <th key={cell.hour} className={s.hour} scope='col'>
                {cell.hour % PULSE.hourTickEvery === 0 ? cell.hour : ''}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const day = t(`days.${PULSE.days[row.day] ?? 'mon'}`);

            return (
              <tr key={row.day}>
                <th className={s.day} scope='row'>
                  {day}
                </th>
                {row.cells.map((cell) => (
                  <td key={cell.hour} className={s.cell} data-level={cell.level} title={t('cell', { day, hour: cell.hour, players: cell.value })}>
                    <span className={s.caption}>{cell.value}</span>
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
