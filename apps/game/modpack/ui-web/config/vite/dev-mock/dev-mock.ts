import type { Plugin } from 'vite';

import { UI_BUILD } from '../vite.constants';

// `bun run ui:dev` opens the page in a browser, which has no Gameface globals: this puts the
// mock bridge (src/dev.ts) in front of the page script. Module scripts run in document order,
// so the mock is installed before the page reads `model`, `engine` and `viewEnv`.
export const devMockPlugin = (): Plugin => ({
  name: 'otmetki:dev-mock',
  apply: 'serve',
  transformIndexHtml: () => [{ tag: 'script', attrs: { type: 'module', src: UI_BUILD.dev.mockEntry }, injectTo: 'head' }]
});
