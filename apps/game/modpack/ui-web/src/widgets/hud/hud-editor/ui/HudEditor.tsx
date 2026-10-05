import { useT } from '@/entities/window/window-state';
import { ActionBar, Button, Empty } from '@/ui-kit';

import type { HudEditorProps } from './HudEditor.types';

import { HUD_EDITOR } from '../config';
import { useHudEditor } from '../model/hooks';
import { HudPanel } from './components';

import s from './HudEditor.module.scss';

export const HudEditor = ({ panels }: HudEditorProps) => {
  const t = useT();
  const editor = useHudEditor(panels);

  return (
    <div className={s.editor}>
      <div className={s.toolbar}>
        <Button disabled={!editor.hasPanels} variant='accent' onClick={editor.editOnScreen}>
          {t('hudOnScreen')}
        </Button>
      </div>
      {editor.hasPanels ? (
        <div ref={editor.stageRef} aria-label={t('hudStage')} className={s.stage} role='group'>
          {editor.panels.map((item) => (
            <HudPanel key={item.panel.id} item={item} />
          ))}
        </div>
      ) : (
        <Empty>{t('hudEmpty')}</Empty>
      )}
      <ActionBar
        items={[
          ...(editor.hasSelection ? [{ id: HUD_EDITOR.resetActionId, label: t('hudReset'), onClick: editor.resetSelected }] : []),
          { id: HUD_EDITOR.resetAllActionId, label: t('hudResetAll'), onClick: editor.resetAll }
        ]}
      />
    </div>
  );
};
