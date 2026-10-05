import { useStore } from '@nanostores/react';

import type { StringKey } from '@/shared/i18n';

import { DEFAULT_LANGUAGE, translator } from '@/shared/i18n';

import { $state } from '../../store';

export const useT = (): ((key: StringKey) => string) => translator(useStore($state)?.language ?? DEFAULT_LANGUAGE);
