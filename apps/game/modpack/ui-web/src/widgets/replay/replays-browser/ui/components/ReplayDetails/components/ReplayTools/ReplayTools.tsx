import clsx from 'clsx';

import { Button, Icon } from '@/ui-kit';

import type { DetailsActionProps } from '../../ReplayDetails.types';

import { useReplaysT } from '../../../../../model/hooks';

import s from './ReplayTools.module.scss';

export const ReplayTools = ({ item, browser }: DetailsActionProps) => {
  const t = useReplaysT();
  const hasHits = item.arena !== null && (browser.page?.hit_viewer.includes(item.arena) ?? false);

  return (
    <div className={s.tools}>
      <Button className={clsx(s.tool, item.favourite && s.favourite)} size='small' variant='ghost' onClick={() => browser.toggleFavourite(item)}>
        <Icon className={s.buttonIcon} name='star' size={14} tone={item.favourite ? 'gold' : 'text'} />
        {item.favourite ? t('favouriteRemove') : t('favouriteAdd')}
      </Button>
      {hasHits && (
        <Button className={s.tool} size='small' variant='ghost' onClick={() => browser.openHits(item)}>
          <Icon className={s.buttonIcon} name='target' size={14} tone='text' />
          {t('viewHits')}
        </Button>
      )}
      <Button className={s.tool} size='small' variant='ghost' onClick={() => browser.startRename(item)}>
        <Icon className={s.buttonIcon} name='pencil' size={14} tone='text' />
        {t('rename')}
      </Button>
      <Button className={clsx(s.tool, s.remove)} size='small' variant='ghost' onClick={() => browser.askRemove(item)}>
        <Icon className={s.buttonIcon} name='trash' size={14} tone='danger' />
        {t('remove')}
      </Button>
    </div>
  );
};
