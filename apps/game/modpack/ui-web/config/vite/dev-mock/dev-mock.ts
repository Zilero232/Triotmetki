import type { Plugin } from 'vite';

import { UI_BUILD } from '../vite.constants';

export const devMockPlugin = (): Plugin => ({
  name: 'otmetki:dev-mock',
  apply: 'serve',
  configureServer: (server) => {
    server.middlewares.use((request, _response, next) => {
      const [pathname, query] = (request.url ?? '').split('?');

      if (pathname === '/') {
        request.url = query ? `${UI_BUILD.dev.page}?${query}` : UI_BUILD.dev.page;
      }

      next();
    });
  },
  transformIndexHtml: () => [{ tag: 'script', attrs: { type: 'module', src: UI_BUILD.dev.mockEntry }, injectTo: 'head' }]
});
