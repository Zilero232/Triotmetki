import clsx from 'clsx';

import { Button } from '@/ui-kit';

import type { ConfirmBoxProps } from './ConfirmBox.types';

import { replayName } from '../../../../../lib/replay-labels';
import { useReplaysT } from '../../../../../model/hooks';

import s from './ConfirmBox.module.scss';

export const ConfirmBox = ({ kind, item, browser }: ConfirmBoxProps) => {
  const t = useReplaysT();

  if (browser.pending !== kind) {
    return null;
  }

  const isRemove = kind === 'remove';

  return (
    <div className={clsx(s.confirm, isRemove && s.confirmDanger)} role='alert'>
      <span className={s.confirmText}>{isRemove ? t('removeConfirm', { name: replayName(item) }) : t('watchConfirm')}</span>
      <span className={s.confirmButtons}>
        <Button className={s.confirmButton} size='small' variant={isRemove ? 'danger' : 'accent'} onClick={browser.confirm}>
          {isRemove ? t('remove') : t('watch')}
        </Button>
        <Button className={s.confirmButton} size='small' variant='ghost' onClick={browser.cancel}>
          {t('cancel')}
        </Button>
      </span>
    </div>
  );
};
