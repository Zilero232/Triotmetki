import { useT } from '@/entities/window/window-state';
import { Button, Empty, Toggle } from '@/ui-kit';

import type { HudEditorProps } from './HudEditor.types';

import { useHudEditor } from '../model/hooks';
import { HudPanel, StageBackdrop } from './components';

import s from './HudEditor.module.scss';

export const HudEditor = ({ panels }: HudEditorProps) => {
  const t = useT();
  const editor = useHudEditor(panels);

  return (
    <div ref={editor.boxRef} className={s.editor}>
      {editor.disabledCount > 0 && (
        <div className={s.toolbar} style={editor.toolbarStyle}>
          <span className={s.legendLabel}>
            {t('hudShowDisabled')} ({editor.disabledCount})
          </span>
          <Toggle label={t('hudShowDisabled')} on={editor.showDisabled} onToggle={editor.toggleDisabled} />
        </div>
      )}
      {editor.hasPanels ? (
        <div ref={editor.stageRef} aria-label={t('hudStage')} className={s.stage} role='group' style={editor.stageStyle}>
          <StageBackdrop />
          {editor.panels.map((item) => (
            <HudPanel key={item.panel.id} item={item} />
          ))}
        </div>
      ) : (
        <Empty>{t('hudEmpty')}</Empty>
      )}
      <div className={s.footer} style={editor.toolbarStyle}>
        {editor.hasSelection && (
          <Button className={s.reset} onClick={editor.resetSelected}>
            {t('hudReset')}
          </Button>
        )}
        <Button className={s.reset} onClick={editor.resetAll}>
          {t('hudResetAll')}
        </Button>
        <span className={s.spacer} />
        <Button disabled={!editor.hasPanels} variant='accent' onClick={editor.editOnScreen}>
          {t('hudOnScreen')}
        </Button>
      </div>
    </div>
  );
};
