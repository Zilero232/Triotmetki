import type { GamefaceBridge } from './gameface.types';

import { createViewEnv } from './view-env';
import { createViewModel } from './view-model';

export const createGamefaceBridge = (scope: object): GamefaceBridge => ({
  ...createViewEnv(scope),
  ...createViewModel(scope)
});

export const gameface = createGamefaceBridge(globalThis);
