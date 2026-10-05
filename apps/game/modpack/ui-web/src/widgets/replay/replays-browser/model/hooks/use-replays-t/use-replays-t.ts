import { useStore } from '@nanostores/react';
import { useMemo } from 'react';

import { $state } from '@/entities/window/window-state';
import { DEFAULT_LANGUAGE } from '@/shared/i18n';

import type { ReplaysText } from '../../../lib/replays-text';

import { replaysText } from '../../../lib/replays-text';

export const useReplaysT = (): ReplaysText => {
  const language = useStore($state)?.language ?? DEFAULT_LANGUAGE;

  return useMemo(() => replaysText(language), [language]);
};
