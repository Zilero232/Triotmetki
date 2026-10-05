import { Button } from '@/ui-kit';

import type { DetailsActionProps } from '../../ReplayDetails.types';

import { pageUpload, uploadHintKey } from '../../../../../lib/replay-labels';
import { useReplaysT } from '../../../../../model/hooks';
import { ReplayIcon } from '../../../ReplayIcon';
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
            <ReplayIcon className={s.buttonIcon} name='external' size={14} />
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
        <ReplayIcon className={s.buttonIcon} name='upload' size={16} />
        {t('upload')}
      </Button>
      {hintKey !== null && <p className={s.hint}>{t(hintKey)}</p>}
    </>
  );
};
