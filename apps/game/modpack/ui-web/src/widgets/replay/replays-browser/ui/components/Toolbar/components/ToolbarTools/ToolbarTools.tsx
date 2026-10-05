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
      <Button className={s.tool} size='small' variant='ghost' onClick={browser.openFolder}>
        <Icon className={s.toolIcon} name='folder' size={16} tone='text' />
        {t('openFolder')}
      </Button>
      <Button className={s.tool} size='small' variant='ghost' onClick={browser.openSiteList}>
        <Icon className={s.toolIcon} name='external-link' size={14} tone='text' />
        {t('siteList')}
      </Button>
    </div>
  );
};
