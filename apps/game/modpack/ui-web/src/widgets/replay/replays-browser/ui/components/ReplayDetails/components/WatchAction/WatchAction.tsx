import clsx from 'clsx';

import { Button } from '@/ui-kit';

import type { DetailsActionProps } from '../../ReplayDetails.types';

import { useReplaysT } from '../../../../../model/hooks';
import { ReplayIcon } from '../../../ReplayIcon';
import { ConfirmBox } from '../ConfirmBox';

import s from './WatchAction.module.scss';

export const WatchAction = ({ item, browser }: DetailsActionProps) => {
  const t = useReplaysT();

  return (
    <>
      {!item.playable && <p className={s.warning}>{t('watchVersion', { version: item.version ?? '?', client: browser.page?.client || '?' })}</p>}
      <Button
        className={clsx(s.watch, !item.playable && s.watchOff)}
        disabled={!item.playable}
        variant='accent'
        onClick={() => browser.askWatch(item)}
      >
        <ReplayIcon className={s.buttonIcon} name='play' size={18} />
        {t('watch')}
      </Button>
      <ConfirmBox browser={browser} item={item} kind='watch' />
    </>
  );
};
