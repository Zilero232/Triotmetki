import type { PatchStatusKind, StatusView } from '@/entities/patch-report';

export type DockAction = 'chooseGame' | 'install' | 'migrate' | 'update';

export type DockState = 'noGame' | 'notInstalled' | PatchStatusKind;

export type StatusDockInput = {
  hasUsableClient: boolean;
  isInstalled: boolean;
  view: StatusView | null;
};

export type StatusDock = {
  state: DockState;
  action: DockAction | null;
};
