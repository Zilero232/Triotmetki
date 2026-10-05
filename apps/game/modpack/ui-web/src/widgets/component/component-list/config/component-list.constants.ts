import type { StringKey } from '@/shared/i18n';

export const CONTEXT_CHOICES: readonly { value: 'all' | 'battle' | 'hangar'; label: StringKey }[] = [
  { value: 'all', label: 'contextAll' },
  { value: 'hangar', label: 'contextHangar' },
  { value: 'battle', label: 'contextBattle' }
];
