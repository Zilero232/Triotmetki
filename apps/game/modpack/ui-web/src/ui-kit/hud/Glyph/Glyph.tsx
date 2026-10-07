import clsx from 'clsx';

import { HUD_GLYPHS, HUD_TONE_COLORS } from '@/shared/config';
import { remSquare } from '@/shared/lib/css-unit';
import { glyphPaths } from '@/shared/lib/glyph-paths';

import type { GlyphProps } from './Glyph.types';

import s from './Glyph.module.scss';

export const Glyph = ({ name, size, tone, className }: GlyphProps) => {
  const { shapes, details } = glyphPaths(name);
  const fill = HUD_TONE_COLORS[tone ?? 'text'].hex;

  return (
    <span className={clsx(s.glyph, className)} style={remSquare(size)}>
      <svg
        aria-hidden='true'
        className={s.svg}
        height='100%'
        viewBox={`0 0 ${HUD_GLYPHS.viewBox} ${HUD_GLYPHS.viewBox}`}
        width='100%'
        xmlns='http://www.w3.org/2000/svg'
      >
        {shapes.map((d) => (
          <path key={d} d={d} fill={fill} stroke={HUD_GLYPHS.outline} strokeLinejoin='round' strokeWidth={HUD_GLYPHS.outlineWidth} />
        ))}
        {details.map((d) => (
          <path key={d} d={d} fill={HUD_GLYPHS.outline} />
        ))}
      </svg>
    </span>
  );
};
