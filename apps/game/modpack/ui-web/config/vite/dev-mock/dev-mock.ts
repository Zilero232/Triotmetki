import type { Plugin } from 'vite';

import { UI_BUILD } from '../vite.constants';

// `bun run ui:dev` opens the page in a browser, which has no Gameface globals: this puts the
// mock bridge (src/dev.ts) in front of the page script. Module scripts run in document order,
// so the mock is installed before the page reads `model`, `engine` and `viewEnv`. The pages live
// in ui-web/pages/, so the server root answers with the settings page.
export const devMockPlugin = (): Plugin => ({
  name: 'otmetki:dev-mock',
  apply: 'serve',
  configureServer: (server) => {
    server.middlewares.use((request, _response, next) => {
      if (request.url === '/') {
        request.url = UI_BUILD.dev.page;
      }

      next();
    });
  },
  transformIndexHtml: () => [{ tag: 'script', attrs: { type: 'module', src: UI_BUILD.dev.mockEntry }, injectTo: 'head' }]
});
