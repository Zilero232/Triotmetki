import type { Plugin } from 'vite';

import { readDesignTokens } from '@otmetki/design-tokens';
import { LOGO_SHAPES } from '@otmetki/icons/shapes';
import { Resvg } from '@resvg/resvg-js';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';

import type { IconNode, IconNodes, SpriteSvgInput, ToneColors } from './icon-sprite.types';

import { UI_ICONS } from '../../../src/shared/config';
import { spriteCell, spriteSize } from '../../../src/shared/lib/icon-sprite';

const LOGO_NODE: IconNode = LOGO_SHAPES.marks.map((d) => ['path', { d }]);

const LUCIDE_ICONS = path.join(path.dirname(createRequire(import.meta.url).resolve('lucide-react/package.json')), 'dist', 'esm', 'icons');

export const parseIconModule = (source: string): IconNode =>
  [...source.matchAll(/\[\s*"([a-z]+)",\s*\{([^}]*)\}\s*\]/g)].map(([, tag = '', body = '']) => [
    tag,
    Object.fromEntries([...body.matchAll(/([A-Z][\w-]*):\s*"([^"]*)"/gi)].map(([, name = '', value = '']) => [name, value]))
  ]);

const lucideNode = (name: string): IconNode => {
  const node = parseIconModule(readFileSync(path.join(LUCIDE_ICONS, `${name}.mjs`), 'utf8'));

  if (node.length === 0) {
    throw new Error(`lucide-react has no icon "${name}"`);
  }

  return node;
};

export const loadIconNodes = (): IconNodes => new Map(UI_ICONS.names.map((name) => [name, name === 'logo' ? LOGO_NODE : lucideNode(name)]));

const escapeAttribute = (value: unknown): string => String(value).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');

const element = ([tag, attributes]: IconNode[number]): string => {
  const pairs = Object.entries(attributes)
    .filter(([key]) => key !== 'key')
    .map(([key, value]) => `${key}="${escapeAttribute(value)}"`);

  return `<${tag} ${pairs.join(' ')}/>`;
};

export const spriteSvg = ({ nodes, colors }: SpriteSvgInput): string => {
  const { cell, viewBox, strokeWidth } = UI_ICONS;
  const { columns, rows } = spriteSize();
  const scale = cell / viewBox;
  const groups = UI_ICONS.tones.flatMap((tone) =>
    UI_ICONS.names.map((name) => {
      const { column, row } = spriteCell({ name, tone });

      return [
        `<g transform="translate(${column * cell} ${row * cell}) scale(${scale})" fill="none" stroke="${colors.get(tone) ?? ''}"`,
        ` stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round">`,
        (nodes.get(name) ?? []).map(element).join(''),
        '</g>'
      ].join('');
    })
  );

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${columns * cell}" height="${rows * cell}" viewBox="0 0 ${columns * cell} ${rows * cell}">`,
    ...groups,
    '</svg>'
  ].join('');
};

export const spritePng = (input: SpriteSvgInput): Uint8Array => new Resvg(spriteSvg(input), { font: { loadSystemFonts: false } }).render().asPng();

const toneColors = async (): Promise<ToneColors> => {
  const { themes } = await readDesignTokens();

  return new Map(UI_ICONS.tones.map((tone) => [tone, themes.dark[UI_ICONS.toneTokens[tone]] ?? '']));
};

const buildSprite = async (): Promise<Uint8Array> => spritePng({ nodes: loadIconNodes(), colors: await toneColors() });

export const iconSpritePlugin = (): Plugin => ({
  name: 'otmetki:icon-sprite',
  configureServer(server) {
    server.middlewares.use(`/${UI_ICONS.file}`, (_request, response) => {
      void buildSprite().then((png) => {
        response.setHeader('Content-Type', 'image/png');
        response.end(Buffer.from(png));
      });
    });
  },
  async generateBundle() {
    this.emitFile({ type: 'asset', fileName: UI_ICONS.file, source: await buildSprite() });
  }
});
