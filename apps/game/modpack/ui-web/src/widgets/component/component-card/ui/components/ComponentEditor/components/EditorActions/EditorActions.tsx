import clsx from 'clsx';

import { useT } from '@/entities/window/window-state';
import { Button, Confirm, Icon } from '@/ui-kit';

import type { EditorActionsProps } from './EditorActions.types';

import s from './EditorActions.module.scss';

export const EditorActions = ({ component, model, compact }: EditorActionsProps) => {
  const t = useT();
  const { card } = model;
  const isUnchanged = card.changedCount === 0;
  const hasReset = component.fields.length > 0;

  return (
    <>
      <div className={clsx(s.actions, compact && s.actionsCompact)}>
        {component.panel && (
          <Button className={s.action} size='small' onClick={card.moveOnScreen}>
            {t('moveOnScreen')}
          </Button>
        )}
        {card.actionItems.map((item) => (
          <Button key={item.id} className={s.action} size='small' onClick={item.onClick}>
            {item.label}
          </Button>
        ))}
        {hasReset && (
          <Button className={clsx(s.action, !compact && s.reset)} disabled={isUnchanged} size='small' variant='ghost' onClick={card.reset}>
            <span className={s.resetLabel}>
              <Icon className={s.resetIcon} name='rotate-ccw' size={14} tone={isUnchanged ? 'muted' : 'accent'} />
              {t('resetDefaults')}
            </span>
          </Button>
        )}
      </div>
      {card.confirmText !== null && (
        <Confirm cancelLabel={t('cancel')} confirmLabel={t('confirm')} text={card.confirmText} onCancel={card.cancel} onConfirm={card.confirm} />
      )}
    </>
  );
};
