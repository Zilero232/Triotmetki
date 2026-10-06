import { match } from 'ts-pattern';
import { useTranslations } from 'use-intl';

import type { DockLines, UseDockLinesInput } from './use-dock-lines.types';

export const useDockLines = ({ state, stateText, clientVersion, availableVersion, modpackVersion }: UseDockLinesInput): DockLines => {
  const t = useTranslations('nav.dock');
  const game = clientVersion ?? '';

  return match(state)
    .with('noGame', () => ({ primary: clientVersion === null ? t('noGame') : t('game', { version: clientVersion }), secondary: stateText }))
    .with('notInstalled', () => ({
      primary: stateText,
      secondary: availableVersion === null ? t('game', { version: game }) : t('available', { version: availableVersion, game })
    }))
    .otherwise(() => ({
      primary: t('modpack', { version: modpackVersion ?? '' }),
      secondary: t('installedDetail', { state: stateText, version: game })
    }));
};
