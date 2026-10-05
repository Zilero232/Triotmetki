import clsx from 'clsx';

import { HUD_FIGURE, HUD_SILHOUETTES } from '@/shared/config';
import { onSilhouette, polygonPath, silhouetteBox, silhouetteOf } from '@/shared/lib/silhouette';

import type { TankSilhouetteProps } from './TankSilhouette.types';

import s from './TankSilhouette.module.scss';

export const TankSilhouette = ({ shape, fill, color, tick = null, width, className, children }: TankSilhouetteProps) => {
  const box = silhouetteBox();
  const silhouette = silhouetteOf(shape);
  const path = polygonPath(silhouette.outline);
  const at = (value: number): string => `${String(onSilhouette({ points: silhouette.outline, value }))}%`;
  const height = Math.round((width * box.height) / box.width);
  const size = { width: `${String(width)}rem`, height: `${String(height)}rem` };

  return (
    <div className={clsx(s.root, className)} style={size}>
      <svg aria-hidden='true' className={s.layer} height='100%' viewBox={box.viewBox} width='100%' xmlns='http://www.w3.org/2000/svg'>
        <path d={path} fill={HUD_FIGURE.empty.color} fillOpacity={HUD_FIGURE.empty.opacity} />
      </svg>
      <div className={s.fill} style={{ width: at(fill) }}>
        <div className={s.fillBox} style={size}>
          <svg aria-hidden='true' height='100%' viewBox={box.viewBox} width='100%' xmlns='http://www.w3.org/2000/svg'>
            <path d={path} fill={color} />
          </svg>
        </div>
      </div>
      <svg aria-hidden='true' className={s.layer} height='100%' viewBox={box.viewBox} width='100%' xmlns='http://www.w3.org/2000/svg'>
        <path d={path} fill='none' stroke={HUD_FIGURE.outline} strokeLinejoin='round' strokeWidth={2} />
        <path d={path} fill='none' stroke={HUD_FIGURE.line.color} strokeLinejoin='round' strokeOpacity={HUD_FIGURE.line.opacity} strokeWidth={0.8} />
        {silhouette.wheels.map((x) => (
          <circle
            key={x}
            cx={x}
            cy={HUD_SILHOUETTES.wheels.y}
            fill='none'
            r={HUD_SILHOUETTES.wheels.radius}
            stroke={HUD_FIGURE.wheel.color}
            strokeOpacity={HUD_FIGURE.wheel.opacity}
            strokeWidth={0.8}
          />
        ))}
      </svg>
      {tick !== null && <span className={s.tick} style={{ left: at(tick) }} />}
      {children}
    </div>
  );
};
