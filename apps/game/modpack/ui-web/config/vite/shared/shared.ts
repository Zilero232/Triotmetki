import type { UserConfig } from 'vite';

import react from '@vitejs/plugin-react';
import colorFunctionalNotation from 'postcss-color-functional-notation';
import pxtorem from 'postcss-pxtorem';

import { scopedClassName } from '../class-name';
import { UI_BUILD } from '../vite.constants';

export const sharedConfig = (): UserConfig => ({
  root: UI_BUILD.root,
  plugins: [react()],
  resolve: { alias: { [UI_BUILD.alias]: UI_BUILD.source } },
  css: {
    modules: { generateScopedName: scopedClassName, localsConvention: 'camelCaseOnly' },
    postcss: {
      plugins: [
        colorFunctionalNotation({ preserve: false }),
        pxtorem({ rootValue: UI_BUILD.style.pixelsPerRem, propList: [...UI_BUILD.style.remProperties], minPixelValue: 0, mediaQuery: false })
      ]
    }
  },
  build: {
    outDir: UI_BUILD.outDir,
    target: UI_BUILD.script.target,
    cssTarget: UI_BUILD.style.target,
    cssMinify: 'esbuild',
    modulePreload: false,
    reportCompressedSize: false
  }
});
