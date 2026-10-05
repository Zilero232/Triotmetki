'use client';

import { useTranslations } from 'next-intl';

import type { ZoneTableProps } from './ZoneTable.types';

import { useArmorZones } from '../../../../../model/hooks/use-armor-zones';

import s from './ZoneTable.module.scss';

export const ZoneTable = ({ geometry }: ZoneTableProps) => {
  const t = useTranslations('armor');
  const { rows, hasShell } = useArmorZones({ geometry });

  return (
    <details className={s.root}>
      <summary className={s.summary}>{t('zones.title')}</summary>
      <div className={s.scroll}>
        <table className={s.table}>
          <caption className={s.caption}>{t(hasShell ? 'zones.caption' : 'zones.captionNoShell')}</caption>
          <thead>
            <tr>
              <th scope='col'>{t('zones.zoneColumn')}</th>
              <th scope='col'>{t('hit.nominal')}</th>
              <th scope='col'>{t('hit.angle')}</th>
              <th scope='col'>{t('hit.total')}</th>
              <th scope='col'>{t('hit.chanceLabel')}</th>
              <th scope='col'>{t('zones.verdictColumn')}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ key, zone, nominal, angle, effective, chance, verdict }) => (
              <tr key={key} data-verdict={verdict ?? undefined}>
                <th scope='row'>{zone}</th>
                <td>{nominal ?? t('zones.none')}</td>
                <td>{angle ?? t('zones.none')}</td>
                <td>{effective ?? t('zones.none')}</td>
                <td>{chance ?? t('zones.none')}</td>
                <td className={s.verdict}>{verdict ? t(`hit.verdict.${verdict}`) : t('zones.miss')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
};
