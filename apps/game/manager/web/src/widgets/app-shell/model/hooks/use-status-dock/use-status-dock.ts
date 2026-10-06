import { match } from 'ts-pattern';
import { useTranslations } from 'use-intl';

import { useCatalog } from '@/entities/catalog';
import { useSelectedClient } from '@/entities/client';
import { useInstallation } from '@/entities/installation';
import { statusMessageValues, statusView, usePatchReport } from '@/entities/patch-report';
import { usePatchAction } from '@/features/patch/patch-actions';
import { useNavigation } from '@/shared/lib';

import { DOCK_ACTIONS } from '../../../config';
import { statusDock } from '../../../lib';

export const useStatusDock = () => {
  const t = useTranslations('nav.dock');
  const { page, navigate } = useNavigation();
  const { query, client, clientPath } = useSelectedClient();
  const { data: installation } = useInstallation(clientPath);
  const { data: report } = usePatchReport();
  const { data: catalog } = useCatalog();
  const isInstalled = installation?.installed ?? false;
  const modpackVersion = isInstalled ? (installation?.modpackVersion ?? null) : null;
  const status = report?.status ?? { kind: 'idle' as const };
  const view = report ? statusView({ status, needsMigration: installation?.needsMigration ?? false }) : null;
  const hasUsableClient = client !== undefined && client.problem === null;
  const { state, action } = statusDock({ hasUsableClient, isInstalled, view });
  const patch = usePatchAction({ kind: action === 'update' || action === 'migrate' ? action : 'check', clientPath });
  const values = statusMessageValues({ status, modpackVersion });

  const runAction = () =>
    match(action)
      .with('chooseGame', () => navigate({ page: 'maintenance' }))
      .with('install', () => navigate({ page: 'install' }))
      .with('update', 'migrate', () => patch.run())
      .with(null, () => undefined)
      .exhaustive();

  const isFirstRunOnScreen = page === 'home' && (action === 'install' || action === 'chooseGame');
  const stateText = t(`state.${state}`, values);
  const lines = match(state)
    .with('noGame', () => ({ primary: client ? t('game', { version: client.version }) : t('noGame'), secondary: stateText }))
    .with('notInstalled', () => ({
      primary: stateText,
      secondary: catalog
        ? t('available', { version: catalog.modpackVersion, game: client?.version ?? '' })
        : t('game', { version: client?.version ?? '' })
    }))
    .otherwise(() => ({
      primary: t('modpack', { version: modpackVersion ?? '' }),
      secondary: t('installedDetail', { state: stateText, version: client?.version ?? '' })
    }));

  return {
    ...lines,
    isLoading: query.isPending,
    tone: isInstalled ? (view?.tone ?? 'neutral') : 'neutral',
    hint: `${lines.primary} · ${lines.secondary}`,
    action:
      action && !isFirstRunOnScreen
        ? {
            ...DOCK_ACTIONS[action],
            label: t(`action.${action}`, values),
            isPending: patch.isPending,
            onRun: runAction
          }
        : null,
    onOpenStatus: () => navigate({ page: isInstalled ? 'updates' : 'home' })
  };
};
