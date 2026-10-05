import type { InputHTMLAttributes, Ref } from 'react';

import type { UiIconName } from '@/shared/lib/icon-sprite';

export type InputVariant = 'code' | 'default' | 'wide';

export type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'className' | 'placeholder' | 'type' | 'value'> & {
  variant?: InputVariant;
  className?: string;
  placeholder?: string;
  icon?: UiIconName;
  value: string;
  inputRef?: Ref<HTMLInputElement>;
  onEscape?: () => void;
};
