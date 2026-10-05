import type { ButtonHTMLAttributes } from 'react';

export type ButtonVariant = 'accent' | 'danger' | 'default' | 'ghost';

export type ButtonSize = 'default' | 'icon' | 'small';

export type ButtonProps = Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'size' | 'type'> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  tooltip?: string;
};
