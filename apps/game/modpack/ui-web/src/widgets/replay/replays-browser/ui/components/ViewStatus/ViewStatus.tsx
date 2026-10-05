import { Button } from '@/ui-kit';

import type { ViewStatusProps } from './ViewStatus.types';

import { REPLAYS_BROWSER } from '../../../config';
import { useReplaysT } from '../../../model/hooks';
import { BrowserStatus } from '../BrowserStatus';

export const ViewStatus = ({ browser }: ViewStatusProps) => {
  const t = useReplaysT();
  const progress = browser.page?.progress ?? { done: 0, total: 0 };

  if (browser.view === 'indexing') {
    return (
      <BrowserStatus
        progress={progress.total > 0 ? (progress.done / progress.total) * REPLAYS_BROWSER.progressScale : 0}
        text={progress.total > 0 ? `${t('indexing')} ${progress.done} / ${progress.total}` : t('indexing')}
      />
    );
  }

  if (browser.view === 'nothing') {
    return (
      <BrowserStatus text={t('nothingFound')}>
        <Button onClick={browser.reset}>{t('resetFilters')}</Button>
      </BrowserStatus>
    );
  }

  return (
    <BrowserStatus text={t(REPLAYS_BROWSER.statusTexts[browser.view])}>
      <Button onClick={browser.refresh}>{t('refresh')}</Button>
    </BrowserStatus>
  );
};
