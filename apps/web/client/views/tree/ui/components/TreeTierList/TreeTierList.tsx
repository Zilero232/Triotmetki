'use client';

import { TANK_CLASS_ICONS, toRoman } from '@otmetki/icons';
import { ChevronDown } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { useTreeTiers } from '../../../model/hooks';

import s from './TreeTierList.module.scss';

export const TreeTierList = () => {
  const t = useTranslations('tree');
  const { tiers, selectTank } = useTreeTiers();

  return (
    <ol aria-label={t('list.label')} className={s.root}>
      {tiers.map(({ tier, isOpen, items }) => (
        <li key={tier}>
          <details className={s.tier} open={isOpen}>
            <summary className={s.summary}>
              <span className={s.tierLabel}>{t('canvas.tier', { tier: toRoman(tier) })}</span>
              <span className={s.count}>{t('list.count', { count: items.length })}</span>
              <ChevronDown aria-hidden className={s.chevron} size={16} />
            </summary>
            <ul className={s.nodes}>
              {items.map(({ vehicle, state, cost }) => {
                const ClassIcon = TANK_CLASS_ICONS[vehicle.type];

                return (
                  <li key={vehicle.tankId}>
                    <button
                      aria-label={t('node.select', { name: vehicle.name })}
                      aria-pressed={state === 'selected'}
                      className={s.node}
                      data-premium={vehicle.isPremium}
                      data-state={state}
                      type='button'
                      onClick={() => selectTank(vehicle.tankId)}
                    >
                      <ClassIcon aria-hidden className={s.icon} size={14} variant={vehicle.isPremium ? 'premium' : 'regular'} />
                      <span className={s.name}>{vehicle.name}</span>
                      <span className={s.cost}>{cost}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </details>
        </li>
      ))}
    </ol>
  );
};
