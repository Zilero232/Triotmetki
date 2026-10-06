import { Button, Icon } from '@/ui-kit';

import type { ToolbarProps } from '../../Toolbar.types';

import { useReplaysT } from '../../../../../model/hooks';

import s from './ToolbarTools.module.scss';

export const ToolbarTools = ({ browser }: ToolbarProps) => {
  const t = useReplaysT();

  return (
    <div className={s.tools}>
      <Button aria-label={t('refresh')} className={s.tool} size='small' tooltip={t('refresh')} variant='ghost' onClick={browser.refresh}>
        <Icon name='refresh-cw' size={16} tone='text' />
      </Button>
      <Button aria-label={t('openFolder')} className={s.tool} size='small' tooltip={t('openFolder')} variant='ghost' onClick={browser.openFolder}>
        <Icon name='folder' size={16} tone='text' />
      </Button>
      <Button aria-label={t('siteList')} className={s.tool} size='small' tooltip={t('siteList')} variant='ghost' onClick={browser.openSiteList}>
        <Icon name='external-link' size={16} tone='text' />
      </Button>
    </div>
  );
};
