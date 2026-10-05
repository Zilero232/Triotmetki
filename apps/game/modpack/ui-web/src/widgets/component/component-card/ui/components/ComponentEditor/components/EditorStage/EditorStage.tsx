import { useT } from '@/entities/window/window-state';
import { ActionBar, Button, Confirm, Icon } from '@/ui-kit';

import type { EditorStageProps } from './EditorStage.types';

import { EditorScreen } from '../EditorScreen';

import s from './EditorStage.module.scss';

export const EditorStage = ({ component, model }: EditorStageProps) => {
  const t = useT();
  const { card, hint } = model;

  return (
    <div className={s.stage}>
      <EditorScreen model={model} />
      <div aria-live='polite' className={s.hint}>
        <span className={s.hintLabel}>{hint.label}</span>
        {hint.text && <span className={s.hintText}>{hint.text}</span>}
      </div>
      <div className={s.actions}>
        {component.panel && (
          <Button className={s.action} size='small' onClick={card.moveOnScreen}>
            {t('moveOnScreen')}
          </Button>
        )}
        <Button className={s.action} disabled={card.changedCount === 0} size='small' variant='ghost' onClick={card.reset}>
          <span className={s.reset}>
            <Icon className={s.resetIcon} name='rotate-ccw' size={14} tone={card.changedCount === 0 ? 'muted' : 'accent'} />
            {t('resetDefaults')}
          </span>
        </Button>
      </div>
      {card.actionItems.length > 0 && <ActionBar items={card.actionItems} />}
      {card.confirmText !== null && (
        <Confirm cancelLabel={t('cancel')} confirmLabel={t('confirm')} text={card.confirmText} onCancel={card.cancel} onConfirm={card.confirm} />
      )}
    </div>
  );
};
