import type { Plugin } from 'vite';

import { UI_BUILD } from '../vite.constants';

const PAGES_PREFIX = `${UI_BUILD.pages.dir}/`;

export const flatPagesPlugin = (): Plugin => ({
  name: 'otmetki:flat-pages',
  apply: 'build',
  enforce: 'post',
  generateBundle(_options, bundle) {
    for (const [key, file] of Object.entries(bundle)) {
      if (file.type === 'asset' && file.fileName.startsWith(PAGES_PREFIX)) {
        Reflect.deleteProperty(bundle, key);
        this.emitFile({ type: 'asset', fileName: file.fileName.slice(PAGES_PREFIX.length), source: file.source });
      }
    }
  }
});
