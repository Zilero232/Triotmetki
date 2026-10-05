import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';

import type { SchematicState } from '../../../../../lib/schematic';
import type { MinimapSchematicProps } from './MinimapSchematic.types';

import s from './MinimapSchematic.module.scss';

const ringClass = (state: SchematicState) => clsx(s.ring, state === 'off' && s.ringOff, state === 'native' && s.ringNative);

export const MinimapSchematic = ({ model }: MinimapSchematicProps) => {
  const t = useT();

  return (
    <div className={s.schematic}>
      <div className={s.map} style={{ opacity: model.opacity, transform: `scale(${model.scale})` }}>
        <span className={s.grid} />
        <span className={clsx(ringClass(model.drawRange), s.draw)} />
        <span className={clsx(ringClass(model.maxViewRange), s.maxView)} />
        <span className={clsx(ringClass(model.viewRange), s.view)} />
        <span className={s.own} />
        <span className={clsx(s.ally, s.allyOne)} />
        <span className={clsx(s.ally, s.allyTwo)} />
        {model.names !== 'never' && (
          <span className={clsx(s.name, model.names === 'native' && s.nameNative)}>
            {t('schematicVehicle')}
            {model.names === 'alt' && <span className={s.key}>{t('schematicAlt')}</span>}
          </span>
        )}
      </div>
      <div className={s.legend}>
        <span className={clsx(s.legendItem, model.viewRange === 'off' && s.legendOff)}>
          <span className={clsx(s.swatch, s.swatchView)} />
          {t('schematicViewRange')}
        </span>
        <span className={clsx(s.legendItem, model.maxViewRange === 'off' && s.legendOff)}>
          <span className={clsx(s.swatch, s.swatchMax)} />
          {t('schematicMaxView')}
        </span>
        <span className={clsx(s.legendItem, model.drawRange === 'off' && s.legendOff)}>
          <span className={clsx(s.swatch, s.swatchDraw)} />
          {t('schematicDrawRange')}
        </span>
      </div>
    </div>
  );
};
