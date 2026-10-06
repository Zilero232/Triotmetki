import clsx from 'clsx';

import type { ShellChipProps } from './ShellChip.types';

import s from './ShellChip.module.scss';

export const ShellChip = ({ label, gold, kind = 'other', className }: ShellChipProps) => (
  <span className={clsx(s.chip, s[kind], gold && s.gold, className)}>{label}</span>
);
