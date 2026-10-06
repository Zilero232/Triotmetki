import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { HudSample } from '@/features/hud/widget-registry';
import { Icon, Segmented } from '@/ui-kit';

import type { EditorScreenProps } from './EditorScreen.types';

import { EDITOR } from '../../../../../config';
import { CameraSchematic } from '../CameraSchematic';
import { MinimapSchematic } from '../MinimapSchematic';

import s from './EditorScreen.module.scss';

export const EditorScreen = ({ model, tall = false }: EditorScreenProps) => {
  const t = useT();
  const hasScreens = model.screens.length > 0;

  return (
    <div className={clsx(s.block, tall && s.tall)}>
      <div className={s.bar}>
        <span className={s.caption}>{t(model.caption)}</span>
        {hasScreens && (
          <span className={s.tools}>
            <Segmented
              className={s.tool}
              items={model.backdropItems}
              label={t('editorBackdrop')}
              value={model.backdrop}
              onSelect={model.setBackdrop}
            />
            <Segmented items={model.zoomItems} label={t('editorZoom')} value={String(model.zoom)} onSelect={model.setZoom} />
          </span>
        )}
      </div>
      <div className={clsx(s.screen, s[model.backdrop])}>
        {model.screens.map((screen) => (
          <div key={screen.id} className={s.sample}>
            {screen.captioned && <span className={s.sampleLabel}>{screen.label}</span>}
            <HudSample
              className={s.view}
              fallback={<Icon name={model.card.icon} size={EDITOR.fallbackIcon} tone='muted' />}
              scale={model.zoom}
              text={screen.text}
              widget={screen.widget}
            />
          </div>
        ))}
        {model.schematic?.kind === 'minimap' && <MinimapSchematic model={model.schematic.minimap} />}
        {model.schematic?.kind === 'camera' && <CameraSchematic model={model.schematic.camera} />}
      </div>
    </div>
  );
};
