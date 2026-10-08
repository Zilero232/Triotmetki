import type { ViewModel } from './view-model.types';

import { GAMEFACE } from '../gameface.constants';
import { invoke, invokeIfPresent, readGlobal, whenReady } from '../scope';

const stringOrNull = (value: unknown): string | null => (typeof value === 'string' ? value : null);

const numberOrNull = (value: unknown): number | null => (typeof value === 'number' ? value : null);

export const createViewModel = (scope: object): ViewModel => {
  const model = () => readGlobal({ scope, name: GAMEFACE.globals.model });
  const property = (name: string): unknown => model()?.[name];

  const subscribe = (callback: () => void): void => {
    let registered: unknown = null;

    const onChanged = (_data: unknown, _indexes: unknown, callbackIds: unknown): void => {
      if (registered === null || !Array.isArray(callbackIds) || callbackIds.includes(registered)) {
        callback();
      }
    };

    const engine = readGlobal({ scope, name: GAMEFACE.globals.engine });
    const { register, path, rootId, trackSubItems } = GAMEFACE.dataChanged;

    invoke({ target: engine, method: GAMEFACE.engine.on, args: [GAMEFACE.engine.dataChangedEvent, onChanged] });

    registered =
      invoke({ target: readGlobal({ scope, name: GAMEFACE.globals.viewEnv }), method: register, args: [path, rootId, trackSubItems] }) ?? null;

    callback();
  };

  const send = (message: string): boolean => {
    const sent = invokeIfPresent({ target: model(), method: GAMEFACE.model.send, args: [{ message }] });

    if (!sent) {
      console.warn(GAMEFACE.log.noModel, message);
    }

    return sent;
  };

  return {
    state: () => stringOrNull(property(GAMEFACE.model.state)),
    feed: () => stringOrNull(property(GAMEFACE.model.feed)),
    escape: () => numberOrNull(property(GAMEFACE.model.escape)),
    send,
    onDataChanged: (callback) => {
      whenReady({ engine: readGlobal({ scope, name: GAMEFACE.globals.engine }), callback: () => subscribe(callback) });
    }
  };
};
