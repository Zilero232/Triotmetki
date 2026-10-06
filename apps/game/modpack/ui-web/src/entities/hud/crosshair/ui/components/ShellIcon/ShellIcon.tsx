import type { ShellIconProps } from './ShellIcon.types';

import { shellSpriteStyle } from '../../../lib/shell-sprite';

import s from './ShellIcon.module.scss';

export const ShellIcon = ({ kind, paint, width, height }: ShellIconProps) => (
  <span aria-hidden='true' className={s.icon} style={shellSpriteStyle({ kind, paint, width, height })} />
);
