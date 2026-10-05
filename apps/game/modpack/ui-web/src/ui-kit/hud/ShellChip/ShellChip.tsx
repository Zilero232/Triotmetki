import clsx from 'clsx';

import type { ShellChipProps } from './ShellChip.types';

import s from './ShellChip.module.scss';

export const ShellChip = ({ label, gold, className }: ShellChipProps) => <span className={clsx(s.chip, gold && s.gold, className)}>{label}</span>;
