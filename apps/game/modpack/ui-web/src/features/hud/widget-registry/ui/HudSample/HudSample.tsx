import clsx from 'clsx';

import { FitBox, HudLines } from '@/ui-kit';

import type { HudSampleProps } from './HudSample.types';

import { useHudSample } from '../../model/hooks';

import s from './HudSample.module.scss';

export const HudSample = ({ widget, text, className, scale, minScale, fallback }: HudSampleProps) => {
  const sample = useHudSample({ widget, text });

  if (sample.isEmpty) {
    return fallback ? <span className={clsx(s.empty, className)}>{fallback}</span> : null;
  }

  return (
    <FitBox className={className} contentKey={sample.contentKey} fallback={fallback} max={scale} minScale={minScale}>
      <div className={s.sample}>{sample.widget ? sample.widget.node : <HudLines lines={sample.lines} />}</div>
    </FitBox>
  );
};
