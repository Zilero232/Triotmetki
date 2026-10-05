import type { Plugin } from 'vite';

import { UI_BUILD } from '../vite.constants';

const PAGES_PREFIX = `${UI_BUILD.pages.dir}/`;

// The page sources live in ui-web/pages/, which Vite keeps in the output path; the client and the
// Python side open them as index.html, hud.html and viewer.html at the root of the gameface folder.
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
