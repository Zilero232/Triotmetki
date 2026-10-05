import type { UserConfig } from 'vite';

import react from '@vitejs/plugin-react';
import pxtorem from 'postcss-pxtorem';

import { scopedClassName } from '../class-name';
import { UI_BUILD } from '../vite.constants';

// Shared by the Gameface builds, the dev server and the modpack-ui Vitest project.
export const sharedConfig = (): UserConfig => ({
  root: UI_BUILD.root,
  plugins: [react()],
  resolve: { alias: { [UI_BUILD.alias]: UI_BUILD.source } },
  css: {
    modules: { generateScopedName: scopedClassName, localsConvention: 'camelCaseOnly' },
    // Gameface scales the page through the root font size, so every length is written in px
    // and shipped as rem (1rem = 1px of the design), tokens included.
    postcss: { plugins: [pxtorem({ rootValue: UI_BUILD.style.pixelsPerRem, propList: ['*'], minPixelValue: 0, mediaQuery: false })] }
  },
  build: {
    outDir: UI_BUILD.outDir,
    target: UI_BUILD.script.target,
    // esbuild, not Lightning CSS: it lowers rgb(r g b / a) to rgba() for this target like
    // Lightning CSS does, but leaves shorthands alone, while Lightning CSS folds
    // flex-direction + flex-wrap into flex-flow and 1 1 auto into flex: auto, which Gameface lacks.
    cssTarget: UI_BUILD.style.target,
    cssMinify: 'esbuild',
    modulePreload: false,
    reportCompressedSize: false
  }
});
