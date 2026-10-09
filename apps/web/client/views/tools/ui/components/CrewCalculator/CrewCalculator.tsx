'use client';

import { useFormatter, useTranslations } from 'next-intl';

import { NumberField, RangeSlider, Switch } from '@/ui-kit';

import type { CrewValues } from './CrewCalculator.types';

import { CREW_BONUSES, CREW_XP } from '../../../config';
import { useCalcState } from '../../../model/hooks';
import { CalcShell } from '../CalcShell';
import { CrewResults } from './components';

import s from './CrewCalculator.module.scss';

export const CrewCalculator = () => {
  const t = useTranslations('tools.crew');
  const format = useFormatter();
  const { values, field } = useCalcState<CrewValues>({ ...CREW_XP.defaults, premium: false, accelerated: false, reserve: false });

  const { skill, percent, xpPerBattle, bookXp } = values;

  return (
    <CalcShell
      inputs={
        <>
          <RangeSlider
            {...CREW_XP.skillRange}
            label={t('skill')}
            value={skill}
            valueLabel={t('skillValue', { skill })}
            onValueChange={field('skill')}
          />
          <RangeSlider
            {...CREW_XP.percentRange}
            label={t('percent')}
            value={percent}
            valueLabel={format.number(percent / 100, 'percent')}
            onValueChange={field('percent')}
          />
          <div className={s.fields}>
            <NumberField {...CREW_XP.xpRange} hint={t('xpHint')} label={t('xpPerBattle')} value={xpPerBattle} onValueChange={field('xpPerBattle')} />
            <NumberField {...CREW_XP.bookRange} hint={t('booksHint')} label={t('books')} value={bookXp} onValueChange={field('bookXp')} />
          </div>
          <div className={s.bonuses}>
            {CREW_BONUSES.map((bonus) => (
              <Switch
                key={bonus}
                checked={values[bonus]}
                description={t(`bonuses.${bonus}.hint`)}
                label={t(`bonuses.${bonus}.label`)}
                onCheckedChange={field(bonus)}
              />
            ))}
          </div>
        </>
      }
      description={t('description')}
      footer={t('footer')}
      results={<CrewResults values={values} />}
      title={t('title')}
    />
  );
};
