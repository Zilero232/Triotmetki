import clsx from 'clsx';

import { spriteStyle } from '@/shared/lib/icon-sprite';

import type { IconProps } from './Icon.types';

import s from './Icon.module.scss';

export const Icon = ({ name, size = 16, tone = 'muted', className }: IconProps) => (
  <span aria-hidden='true' className={clsx(s.icon, className)} style={spriteStyle({ name, tone, size })} />
);
