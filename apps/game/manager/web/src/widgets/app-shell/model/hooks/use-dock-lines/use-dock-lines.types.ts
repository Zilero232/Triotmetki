import type { DockState } from '../../../lib';

export type UseDockLinesInput = {
  state: DockState;
  stateText: string;
  clientVersion: string | null;
  availableVersion: string | null;
  modpackVersion: string | null;
};

export type DockLines = {
  primary: string;
  secondary: string;
};
