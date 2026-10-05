import { useT } from '@/entities/window/window-state';
import { Button, Icon, IconButton } from '@/ui-kit';

import { useUndoToast } from '../model/hooks';

import s from './UndoToast.module.scss';

export const UndoToast = () => {
  const t = useT();
  const toast = useUndoToast();

  if (!toast.visible) {
    return null;
  }

  return (
    <div aria-live='polite' className={s.toast} role='status'>
      <Icon className={s.icon} name='check' size={16} tone='success' />
      <span className={s.text}>{toast.text}</span>
      <Button size='small' variant='accent' onClick={toast.undo}>
        <span className={s.undo}>
          <Icon className={s.undoIcon} name='undo-2' size={14} tone='contrast' />
          {toast.undoLabel}
        </span>
      </Button>
      <IconButton className={s.close} icon='x' label={t('dismiss')} size='small' variant='ghost' onClick={toast.dismiss} />
    </div>
  );
};
