import clsx from 'clsx';

import { ClientIcon } from '@/ui-kit';

import type { TeamStripProps } from './TeamStrip.types';

import { TEAM_HP } from '../../../config';

import s from './TeamStrip.module.scss';

export const TeamStrip = ({ items, mirrored = false }: TeamStripProps) => (
  <div className={clsx(s.strip, mirrored && s.mirrored)}>
    {items.map((item) =>
      item.kind === 'tier' ? (
        <span key={item.key} className={s.tier}>
          {item.label}
        </span>
      ) : (
        <span key={item.key} className={clsx(s.vehicle, !item.alive && s.dead)}>
          <ClientIcon icon={item.icon} size={TEAM_HP.iconSize} />
        </span>
      )
    )}
  </div>
);
