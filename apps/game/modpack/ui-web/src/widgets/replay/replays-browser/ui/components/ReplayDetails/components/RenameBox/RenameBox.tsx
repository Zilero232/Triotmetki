import { onEnterKey } from '@/shared/lib/enter-key';
import { Button } from '@/ui-kit';

import type { RenameBoxProps } from './RenameBox.types';

import { REPLAYS_BROWSER } from '../../../../../config';
import { useReplaysT } from '../../../../../model/hooks';

import s from './RenameBox.module.scss';

export const RenameBox = ({ browser }: RenameBoxProps) => {
  const t = useReplaysT();

  if (browser.draft === null) {
    return null;
  }

  return (
    <div className={s.rename}>
      <input
        aria-label={t('rename')}
        className={s.renameInput}
        maxLength={REPLAYS_BROWSER.renameMaxLength}
        type='text'
        value={browser.draft}
        onChange={(event) => browser.editRename(event.currentTarget.value)}
        onKeyDown={(event) => onEnterKey(browser.submitRename)(event.key)}
      />
      <Button className={s.confirmButton} size='small' variant='accent' onClick={browser.submitRename}>
        {t('renameSave')}
      </Button>
      <Button className={s.confirmButton} size='small' variant='ghost' onClick={browser.cancelRename}>
        {t('cancel')}
      </Button>
    </div>
  );
};
