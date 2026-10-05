import type { UiIconName, UiIconTone } from '@/shared/lib/icon-sprite';

export type IconButtonVariant = 'accent' | 'default' | 'ghost';

export type IconButtonProps = {
  icon: UiIconName;
  label: string;
  variant?: IconButtonVariant;
  size?: 'default' | 'small';
  tone?: UiIconTone;
  disabled?: boolean;
  className?: string;
  onClick: () => void;
};
