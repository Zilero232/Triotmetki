import clsx from 'clsx';

import { useTooltip } from '@/shared/lib/use-tooltip';

import type { ButtonProps } from './Button.types';

import s from './Button.module.scss';

export const Button = ({ variant = 'default', size = 'default', className, tooltip, ...props }: ButtonProps) => {
  const tip = useTooltip(tooltip);

  return <button className={clsx(s.button, s[variant], s[size], className)} type='button' {...props} {...tip} />;
};
