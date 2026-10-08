import { remBox } from '@/shared/lib/css-unit';

import type { ArmorMapProps } from './ArmorMap.types';

import { useArmorCanvas } from '../../model/hooks';

import s from './ArmorMap.module.scss';

export const ArmorMap = ({ data, onDrawn }: ArmorMapProps) => {
  const { ref, screen } = useArmorCanvas({ map: data, onDrawn });

  return (
    <div className={s.map} style={remBox(screen.rem)}>
      <canvas ref={ref} className={s.canvas} height={screen.pixels.height} width={screen.pixels.width} />
    </div>
  );
};
