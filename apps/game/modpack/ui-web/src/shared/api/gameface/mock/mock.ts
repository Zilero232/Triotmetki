import { entries } from 'remeda';

import type { CreateEngineInput, EngineListener, GamefaceMock, GamefaceMockInput, GamefaceMockPush } from './mock.types';

import { GAMEFACE } from '../gameface.constants';
import { GAMEFACE_MOCK } from './mock.constants';

const tooltipResources = () => ({
  views: {
    common: {
      tooltip_window: {
        simple_tooltip_content: { SimpleTooltipContent: () => GAMEFACE_MOCK.tooltipContentId },
        tooltip_window: { TooltipWindow: () => GAMEFACE_MOCK.tooltipDecoratorId }
      }
    }
  }
});

const createEngine = ({ listeners, engineListeners }: CreateEngineInput) => ({
  [GAMEFACE.engine.whenReady]: Promise.resolve(),
  [GAMEFACE.engine.on]: (event: string, listener: EngineListener) => {
    if (event === GAMEFACE.engine.dataChangedEvent) {
      listeners.push(listener);

      return;
    }

    engineListeners.set(event, [...(engineListeners.get(event) ?? []), () => listener(null, [], [])]);
  }
});

export const createGamefaceMock = ({ state, feed = '', clientSize, remScale, mouse, tooltips = false, onSend }: GamefaceMockInput): GamefaceMock => {
  const listeners: EngineListener[] = [];
  const sent: string[] = [];
  const inputAreas: number[][] = [];
  const resizes: number[][] = [];
  const engineListeners = new Map<string, (() => void)[]>();
  const viewEvents: unknown[] = [];
  const tooltipScope = tooltips ? { [GAMEFACE.globals.resources]: tooltipResources() } : {};
  const tooltipEnv = tooltips ? { [GAMEFACE.viewEvent.handle]: (event: unknown) => viewEvents.push(event) } : {};

  const model: Record<string, unknown> = {
    [GAMEFACE.model.state]: state,
    [GAMEFACE.model.feed]: feed,
    [GAMEFACE.model.escape]: 0
  };

  const push = (values: GamefaceMockPush): void => {
    entries(values).forEach(([key, value]) => {
      if (value !== undefined) {
        model[GAMEFACE_MOCK.properties[key]] = value;
      }
    });

    listeners.forEach((listener) => listener(model, [], [GAMEFACE_MOCK.callbackId]));
  };

  model[GAMEFACE.model.send] = ({ message }: { message: string }) => {
    sent.push(message);

    const next = onSend(message);

    if (next !== null) {
      push(typeof next === 'string' ? { state: next } : next);
    }
  };

  const engine = createEngine({ listeners, engineListeners });

  return {
    scope: {
      [GAMEFACE.globals.model]: model,
      [GAMEFACE.globals.engine]: engine,
      [GAMEFACE.globals.viewEnv]: {
        [GAMEFACE.viewEnv.clientSize]: clientSize,
        [GAMEFACE.viewEnv.remToPx]: remScale ? (rem: number) => rem * remScale() : undefined,
        [GAMEFACE.viewEnv.resizeView]: (...size: number[]) => resizes.push(size),
        [GAMEFACE.dataChanged.register]: () => GAMEFACE_MOCK.callbackId,
        [GAMEFACE.viewEnv.inputArea]: (...area: number[]) => inputAreas.push(area),
        [GAMEFACE.viewEnv.mousePosition]: mouse,
        ...tooltipEnv
      },
      ...tooltipScope
    },
    push,
    sent: () => [...sent],
    inputAreas: () => [...inputAreas],
    viewEvents: () => [...viewEvents],
    emit: (event) => engineListeners.get(event)?.forEach((listener) => listener()),
    resizes: () => [...resizes]
  };
};

export const installGamefaceMock = (mock: GamefaceMock): void => {
  Object.entries(mock.scope).forEach(([name, value]) => Reflect.set(globalThis, name, value));
};
