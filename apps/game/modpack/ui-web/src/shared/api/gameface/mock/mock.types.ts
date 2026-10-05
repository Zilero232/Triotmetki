import type { ClientSize } from '../gameface.types';

export type GamefaceMockPush = {
  state?: string;
  feed?: string;
  escape?: number;
};

export type GamefaceMockInput = {
  state: string;
  feed?: string;
  clientSize: () => ClientSize | null;
  remScale?: () => number;
  mouse?: () => { x: number; y: number };
  tooltips?: boolean;
  onSend: (message: string) => string | GamefaceMockPush | null;
};

export type GamefaceMock = {
  scope: Record<string, unknown>;
  push: (values: GamefaceMockPush) => void;
  sent: () => string[];
  inputAreas: () => number[][];
  viewEvents: () => unknown[];
  emit: (event: string) => void;
  resizes: () => number[][];
};

export type EngineListener = (data: unknown, indexes: unknown, callbackIds: number[]) => void;

export type CreateEngineInput = { listeners: EngineListener[]; engineListeners: Map<string, (() => void)[]> };
