import clsx from 'clsx';

import { parseIcon } from '@/shared/lib/client-icon';
import { remBox } from '@/shared/lib/css-unit';

import type { ClientIconProps } from './ClientIcon.types';

import { Glyph } from '../Glyph';

import s from './ClientIcon.module.scss';

export const ClientIcon = ({ icon, size, width, tone, className }: ClientIconProps) => {
  const { image, glyph } = parseIcon(icon);

  if (image) {
    return (
      <img
        alt=''
        className={clsx(s.icon, className)}
        draggable={false}
        height={size}
        src={image}
        style={remBox({ width: width ?? size, height: size })}
        width={width ?? size}
      />
    );
  }

  return glyph ? <Glyph className={clsx(s.icon, className)} name={glyph} size={size} tone={tone} /> : null;
};
