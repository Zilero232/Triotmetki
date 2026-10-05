import type { StatusDock, StatusDockInput } from './status-dock.types';

export const statusDock = ({ hasUsableClient, isInstalled, view }: StatusDockInput): StatusDock => {
  if (!hasUsableClient) {
    return { state: 'noGame', action: 'chooseGame' };
  }

  if (!isInstalled) {
    return { state: 'notInstalled', action: 'install' };
  }

  if (view === null) {
    return { state: 'idle', action: null };
  }

  return { state: view.action === 'migrate' ? 'migration_ready' : view.kind, action: view.action };
};
