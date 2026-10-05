import { isRecord } from '@/shared/lib/is-record';

import type { ClientSize, InputArea, ViewRect } from '../gameface.types';
import type { ViewEnv } from './view-env.types';

import { GAMEFACE } from '../gameface.constants';
import { invoke, invokeIfPresent, readGlobal, whenReady } from '../scope';

const toClientSize = (value: unknown): ClientSize | null => {
  if (!isRecord(value) || typeof value.width !== 'number' || typeof value.height !== 'number') {
    return null;
  }

  return { width: value.width, height: value.height };
};

const toPoint = (value: unknown): { x: number; y: number } | null => {
  if (!isRecord(value) || typeof value.x !== 'number' || typeof value.y !== 'number') {
    return null;
  }

  return { x: value.x, y: value.y };
};

const toScale = (value: unknown): number | null => (typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null);

export const createViewEnv = (scope: object): ViewEnv => {
  const target = () => readGlobal(scope, GAMEFACE.globals.viewEnv);
  const call = (method: string, args: unknown[] = []): unknown => invoke({ target: target(), method, args });

  const clientSize = (): ClientSize | null => toClientSize(call(GAMEFACE.viewEnv.clientSize));

  const resizeView = ({ width, height }: ClientSize): boolean =>
    invokeIfPresent({ target: target(), method: GAMEFACE.viewEnv.resizeView, args: [width, height] });

  const viewRect = (): ViewRect | null => {
    const position = toPoint(call(GAMEFACE.viewEnv.viewPosition));
    const size = toClientSize(call(GAMEFACE.viewEnv.viewSize));

    return position && size ? { ...position, ...size } : null;
  };

  const fitView = (): boolean => {
    const client = clientSize();

    return client !== null && resizeView(client);
  };

  const onScreenChanged = (callback: () => void): void => {
    const engine = readGlobal(scope, GAMEFACE.globals.engine);
    const listen = (event: string): unknown => invoke({ target: engine, method: GAMEFACE.engine.on, args: [event, callback] });

    whenReady({ engine, callback });
    listen(GAMEFACE.engine.clientResized);
    listen(GAMEFACE.engine.scaleUpdated);
  };

  const setInputArea = ({ left, top, width, height }: InputArea): boolean =>
    invokeIfPresent({ target: target(), method: GAMEFACE.viewEnv.inputArea, args: [left, top, width, height] });

  return {
    clientSize,
    clientSizeRem: () => toClientSize(call(GAMEFACE.viewEnv.clientSizeRem)),
    viewRect,
    remScale: () => toScale(call(GAMEFACE.viewEnv.remToPx, [1])),
    mousePosition: () => toPoint(call(GAMEFACE.viewEnv.mousePosition)),
    resizeView,
    fitView,
    onScreenChanged,
    setInputArea
  };
};
