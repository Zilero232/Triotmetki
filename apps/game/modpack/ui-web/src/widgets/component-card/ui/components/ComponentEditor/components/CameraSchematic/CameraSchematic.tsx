import clsx from 'clsx';

import type { CameraSchematicProps } from './CameraSchematic.types';

import { useT } from '../../../../../../../entities/window-state';

import s from './CameraSchematic.module.scss';

export const CameraSchematic = ({ model }: CameraSchematicProps) => {
  const t = useT();
  const steady = model.stabilization !== 'off';
  const shakes = model.shake === 'on';

  return (
    <div className={s.schematic}>
      <div className={clsx(s.scope, shakes && s.shaking)}>
        <span className={clsx(s.horizon, !steady && s.tilted)} />
        <span className={s.crossX} />
        <span className={s.crossY} />
        <span className={s.circle} />
        {model.zoom && <span className={s.zoom}>{`${t('schematicZoom')}: ${model.zoom}`}</span>}
        {shakes && <span className={clsx(s.shake, s.shakeLeft)} />}
        {shakes && <span className={clsx(s.shake, s.shakeRight)} />}
      </div>
      <div className={s.legend}>
        {model.preset && <span className={s.preset}>{model.preset}</span>}
        <span className={s.note}>{t(steady ? 'schematicHorizonSteady' : 'schematicHorizonFree')}</span>
        <span className={s.note}>{t(shakes ? 'schematicShake' : 'schematicSteady')}</span>
      </div>
    </div>
  );
};
