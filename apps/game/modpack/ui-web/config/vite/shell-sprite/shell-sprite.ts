import type { Plugin } from 'vite';

import { Resvg } from '@resvg/resvg-js';

import { RETICLE_SHELLS } from '../../../src/entities/hud/crosshair/config';
import { shellSpriteSvg } from '../../../src/entities/hud/crosshair/lib/shell-sprite';

export const shellSpritePng = (): Uint8Array => new Resvg(shellSpriteSvg(), { font: { loadSystemFonts: false } }).render().asPng();

export const shellSpritePlugin = (): Plugin => ({
  name: 'otmetki:shell-sprite',
  configureServer(server) {
    server.middlewares.use(`/${RETICLE_SHELLS.sprite.file}`, (_request, response) => {
      response.setHeader('Content-Type', 'image/png');
      response.end(Buffer.from(shellSpritePng()));
    });
  },
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: RETICLE_SHELLS.sprite.file, source: shellSpritePng() });
  }
});
