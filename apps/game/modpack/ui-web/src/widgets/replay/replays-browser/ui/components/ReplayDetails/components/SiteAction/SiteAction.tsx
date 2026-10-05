import { Button, Icon } from '@/ui-kit';

import type { DetailsActionProps } from '../../ReplayDetails.types';

import { pageUpload, uploadHintKey } from '../../../../../lib/replay-labels';
import { useReplaysT } from '../../../../../model/hooks';
import { SiteState } from '../../../SiteState';

import s from './SiteAction.module.scss';

export const SiteAction = ({ item, browser }: DetailsActionProps) => {
  const t = useReplaysT();

  if (item.site) {
    return (
      <div className={s.site}>
        <SiteState size='details' state={item.site.state} />
        {item.site.link && (
          <Button className={s.siteLink} size='small' variant='ghost' onClick={() => browser.openSite(item)}>
            <Icon className={s.buttonIcon} name='external-link' size={14} tone='text' />
            {t('openOnSite')}
          </Button>
        )}
      </div>
    );
  }

  const hintKey = uploadHintKey({ item, upload: pageUpload(browser.page) });

  return (
    <>
      <Button className={s.upload} disabled={hintKey !== null} onClick={() => browser.upload(item)}>
        <Icon className={s.buttonIcon} name='cloud-upload' size={16} tone={hintKey === null ? 'text' : 'muted'} />
        {t('upload')}
      </Button>
      {hintKey !== null && <p className={s.hint}>{t(hintKey)}</p>}
    </>
  );
};
