import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { HudSample } from '@/features/hud/widget-registry';
import { Segmented } from '@/ui-kit';

import type { EditorScreenProps } from './EditorScreen.types';

import { CameraSchematic } from '../CameraSchematic';
import { MinimapSchematic } from '../MinimapSchematic';

import s from './EditorScreen.module.scss';

export const EditorScreen = ({ model }: EditorScreenProps) => {
  const t = useT();
  const hasScreens = model.screens.length > 0;

  return (
    <div className={clsx(s.screen, s[model.backdrop])}>
      <span className={s.caption}>{t(model.caption)}</span>
      <div className={s.tools}>
        {hasScreens && (
          <Segmented className={s.tool} items={model.backdropItems} label={t('editorBackdrop')} value={model.backdrop} onSelect={model.setBackdrop} />
        )}
        {hasScreens && <Segmented items={model.zoomItems} label={t('editorZoom')} value={String(model.zoom)} onSelect={model.setZoom} />}
      </div>
      <div className={s.view}>
        {model.screens.map((screen) => (
          <div key={screen.id} className={s.sample}>
            {screen.captioned && <span className={s.sampleLabel}>{screen.label}</span>}
            <div className={s.zoomed} style={{ transform: `scale(${model.zoom})` }}>
              <HudSample text={screen.text} widget={screen.widget} />
            </div>
          </div>
        ))}
        {model.schematic?.kind === 'minimap' && <MinimapSchematic model={model.schematic.minimap} />}
        {model.schematic?.kind === 'camera' && <CameraSchematic model={model.schematic.camera} />}
      </div>
    </div>
  );
};
