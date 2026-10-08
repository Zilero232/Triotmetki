import { remBox } from '@/shared/lib/css-unit';

import type { ArmorMapWidgetProps } from './ArmorMapWidget.types';

import { useArmorCanvas } from '../model/hooks';

import s from './ArmorMapWidget.module.scss';

export const ArmorMapWidget = ({ data }: ArmorMapWidgetProps) => {
  const { ref, screen } = useArmorCanvas(data);

  return (
    <div className={s.map} style={remBox(screen.rem)}>
      <canvas ref={ref} className={s.canvas} height={screen.pixels.height} width={screen.pixels.width} />
    </div>
  );
};
