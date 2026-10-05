import { Button } from '@/ui-kit';

import type { ToolbarProps } from '../../Toolbar.types';

import { useReplaysT } from '../../../../../model/hooks';
import { ReplayIcon } from '../../../ReplayIcon';

import s from './ToolbarTools.module.scss';

export const ToolbarTools = ({ browser }: ToolbarProps) => {
  const t = useReplaysT();

  return (
    <div className={s.tools}>
      <Button aria-label={t('refresh')} className={s.tool} size='small' tooltip={t('refresh')} variant='ghost' onClick={browser.refresh}>
        <ReplayIcon name='refresh' size={16} />
      </Button>
      <Button className={s.tool} size='small' variant='ghost' onClick={browser.openFolder}>
        <ReplayIcon className={s.toolIcon} name='folder' size={16} />
        {t('openFolder')}
      </Button>
      <Button className={s.tool} size='small' variant='ghost' onClick={browser.openSiteList}>
        <ReplayIcon className={s.toolIcon} name='external' size={14} />
        {t('siteList')}
      </Button>
    </div>
  );
};
