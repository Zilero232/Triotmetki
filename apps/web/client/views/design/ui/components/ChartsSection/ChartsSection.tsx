'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { AreaChart, BarChart, LineChart } from '@/ui-kit';

import { CHART_SPECIMENS } from '../../../config';
import { DesignBlock } from '../DesignBlock';

import s from './ChartsSection.module.scss';

export const ChartsSection = () => {
  const t = useTranslations('design.charts');
  const format = useFormatter();

  const labels = CHART_SPECIMENS.lineA.map((_, index) => t('point', { point: index + 1 }));

  return (
    <DesignBlock id='charts' title={t('title')}>
      <div className={s.grid}>
        <figure className={s.figure}>
          <figcaption className={s.caption}>{t('line')}</figcaption>
          <LineChart
            series={[
              { id: 'a', label: t('seriesA'), values: [...CHART_SPECIMENS.lineA], tone: 'unicum' },
              { id: 'b', label: t('seriesB'), values: [...CHART_SPECIMENS.lineB], tone: 'great' }
            ]}
            ariaLabel={t('line')}
            labels={labels}
          />
        </figure>
        <figure className={s.figure}>
          <figcaption className={s.caption}>{t('area')}</figcaption>
          <AreaChart
            ariaLabel={t('area')}
            formatValue={(value) => format.number(value / 100, { style: 'percent', maximumFractionDigits: 1 })}
            labels={labels}
            series={[{ id: 'a', label: t('seriesA'), values: [...CHART_SPECIMENS.area] }]}
          />
        </figure>
        <figure className={s.figureWide}>
          <figcaption className={s.caption}>{t('bar')}</figcaption>
          <BarChart
            ariaLabel={t('bar')}
            labels={labels}
            series={[{ id: 'a', label: t('seriesA'), values: [...CHART_SPECIMENS.bars], tone: 'steel' }]}
          />
        </figure>
      </div>
    </DesignBlock>
  );
};
