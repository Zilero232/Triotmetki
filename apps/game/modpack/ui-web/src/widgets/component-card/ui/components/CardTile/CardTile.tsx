import type { CardTileProps } from './CardTile.types';

import { Icon } from '../../../../../shared/ui/icon';

import s from './CardTile.module.scss';

export const CardTile = ({ icon, enabled }: CardTileProps) => (
  <span className={s.tile}>
    <Icon name={icon} size={18} tone={enabled ? 'text' : 'muted'} />
  </span>
);
