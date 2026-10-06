import type { SHELL_CHIP_KINDS } from './ShellChip.constants';

export type ShellChipKind = (typeof SHELL_CHIP_KINDS)[number];

export type ShellChipProps = { label: string; gold: boolean; kind?: ShellChipKind; className?: string };
