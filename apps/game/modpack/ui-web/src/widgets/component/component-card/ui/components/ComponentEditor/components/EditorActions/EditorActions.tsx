import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { ActionBar, Button, Confirm, Icon } from '@/ui-kit';

import type { EditorActionsProps } from './EditorActions.types';

import s from './EditorActions.module.scss';

export const EditorActions = ({ component, model, compact }: EditorActionsProps) => {
  const t = useT();
  const { card } = model;
  const isUnchanged = card.changedCount === 0;

  return (
    <>
      <div className={clsx(s.actions, compact && s.actionsCompact)}>
        {component.panel && (
          <Button className={s.action} size='small' onClick={card.moveOnScreen}>
            {t('moveOnScreen')}
          </Button>
        )}
        {component.fields.length > 0 && (
          <Button className={s.action} disabled={isUnchanged} size='small' variant='ghost' onClick={card.reset}>
            <span className={s.reset}>
              <Icon className={s.resetIcon} name='rotate-ccw' size={14} tone={isUnchanged ? 'muted' : 'accent'} />
              {t('resetDefaults')}
            </span>
          </Button>
        )}
      </div>
      {card.actionItems.length > 0 && (
        <div className={s.bar}>
          <ActionBar items={card.actionItems} />
        </div>
      )}
      {card.confirmText !== null && (
        <Confirm cancelLabel={t('cancel')} confirmLabel={t('confirm')} text={card.confirmText} onCancel={card.cancel} onConfirm={card.confirm} />
      )}
    </>
  );
};
