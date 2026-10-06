import type { UiSound } from './sound.types';

import { GAMEFACE } from '../gameface.constants';
import { invoke, readGlobal } from '../scope';

const ignore = (): undefined => undefined;

const createUiSound = (scope: object): UiSound => ({
  play: (name) => {
    const engine = readGlobal({ scope, name: GAMEFACE.globals.engine });
    const call = invoke({ target: engine, method: GAMEFACE.engine.call, args: [GAMEFACE.sound.event, GAMEFACE.sound.names[name]] });

    if (call instanceof Promise) {
      void call.catch(ignore);
    }
  }
});

export const uiSound = createUiSound(globalThis);
