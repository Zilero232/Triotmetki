import type { ShellSpriteCell, ShellSpriteCellInput, ShellSpriteStyle, ShellSpriteStyleInput } from './shell-sprite.types';

import { RETICLE_SHELLS } from '../../config';

const { sprite, viewBox } = RETICLE_SHELLS;

const rem = (value: number): string => `${String(value)}rem`;

export const shellSpriteCell = ({ kind, paint }: ShellSpriteCellInput): ShellSpriteCell => ({
  column: sprite.kinds.indexOf(kind ?? 'ap'),
  row: sprite.paints.indexOf(paint)
});

export const shellSpriteStyle = ({ kind, paint, width, height }: ShellSpriteStyleInput): ShellSpriteStyle => {
  const { column, row } = shellSpriteCell({ kind, paint });

  return {
    width: rem(width),
    height: rem(height),
    backgroundImage: `url(${sprite.file})`,
    backgroundSize: `${rem(sprite.kinds.length * width)} ${rem(sprite.paints.length * height)}`,
    backgroundPosition: `${rem(-column * width)} ${rem(-row * height)}`
  };
};

const shellGroup = ({ kind, paint }: ShellSpriteCellInput): string => {
  const { column, row } = shellSpriteCell({ kind, paint });
  const look = RETICLE_SHELLS.paint[paint];
  const fillOpacity = 'fillOpacity' in look ? look.fillOpacity : 1;
  const strokeOpacity = 'strokeOpacity' in look ? look.strokeOpacity : 1;
  const paths = [RETICLE_SHELLS.noses[kind ?? 'ap'], RETICLE_SHELLS.case, RETICLE_SHELLS.rim].map((d) => `<path d="${d}"/>`);

  return [
    `<g transform="translate(${String(column * viewBox.width * sprite.scale)} ${String(row * viewBox.height * sprite.scale)}) scale(${String(sprite.scale)})"`,
    ` fill="${look.fill}" fill-opacity="${String(fillOpacity)}" stroke="${look.stroke}" stroke-opacity="${String(strokeOpacity)}"`,
    ` stroke-width="${String(RETICLE_SHELLS.outlineWidth)}" stroke-linejoin="round">`,
    ...paths,
    '</g>'
  ].join('');
};

export const shellSpriteSvg = (): string => {
  const width = sprite.kinds.length * viewBox.width * sprite.scale;
  const height = sprite.paints.length * viewBox.height * sprite.scale;
  const groups = sprite.paints.flatMap((paint) => sprite.kinds.map((kind) => shellGroup({ kind, paint })));

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${String(width)}" height="${String(height)}" viewBox="0 0 ${String(width)} ${String(height)}">`,
    ...groups,
    '</svg>'
  ].join('');
};
