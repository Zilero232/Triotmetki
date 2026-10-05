import { useT } from '@/entities/window/window-state';
import { HudSample } from '@/features/hud/widget-registry';
import { Button } from '@/ui-kit';

import type { PanelPreviewProps } from './PanelPreview.types';

import s from './PanelPreview.module.scss';

export const PanelPreview = ({ panel, onMove }: PanelPreviewProps) => {
  const t = useT();

  return (
    <div className={s.preview}>
      <div className={s.screen}>
        <span className={s.caption}>{t('preview')}</span>
        {panel && <HudSample className={s.sample} text={panel.text ?? panel.preview} widget={panel.widget} />}
      </div>
      <Button className={s.move} size='small' onClick={onMove}>
        {t('moveOnScreen')}
      </Button>
    </div>
  );
};
