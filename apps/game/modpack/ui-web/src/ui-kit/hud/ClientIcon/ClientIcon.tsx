import clsx from 'clsx';

import { parseIcon, renditionBox } from '@/shared/lib/client-icon';
import { remBox } from '@/shared/lib/css-unit';

import type { ClientIconProps } from './ClientIcon.types';

import { Glyph } from '../Glyph';

import s from './ClientIcon.module.scss';

export const ClientIcon = ({ icon, size, width, native = false, tone, className }: ClientIconProps) => {
  const { image, glyph } = parseIcon(icon);

  if (image) {
    const box = (native ? renditionBox(image) : null) ?? { width: width ?? size, height: size };

    return <img alt='' className={clsx(s.icon, className)} draggable={false} height={box.height} src={image} style={remBox(box)} width={box.width} />;
  }

  return glyph ? <Glyph className={clsx(s.icon, className)} name={glyph} size={size} tone={tone} /> : null;
};
