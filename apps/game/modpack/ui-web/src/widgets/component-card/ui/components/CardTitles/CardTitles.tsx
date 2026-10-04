import clsx from 'clsx';

import type { CardTitlesProps } from './CardTitles.types';

import { useT } from '../../../../../entities/window-state';

import s from './CardTitles.module.scss';

export const CardTitles = ({ component, card }: CardTitlesProps) => {
  const t = useT();
  const tags = [...card.badges.map((badge) => t(badge.key)), ...(component.panel ? [t('panelBadge')] : [])];

  return (
    <span className={s.titles}>
      <span className={s.titleRow}>
        <span className={clsx(s.title, !card.enabled && s.titleOff)}>{component.title}</span>
        {tags.length > 0 && <span className={s.tags}>{tags.join(' · ')}</span>}
        {card.changedCount > 0 && <span className={s.changed}>{`${card.changedCount} ${t('changedShort')}`}</span>}
      </span>
      {component.hint && <span className={clsx(s.hint, card.open && s.hintFull)}>{component.hint}</span>}
    </span>
  );
};
