import { useState } from 'react';

import { Button } from '@/ui-kit';

import type { ReplaysBrowserProps } from './ReplaysBrowser.types';

import { useReplaysBrowser, useReplaysT } from '../model/hooks';
import { BrowserStatus, FilterBar, ReplayDetails, ReplayList, SummaryStrip, Toolbar, ViewStatus } from './components';

import s from './ReplaysBrowser.module.scss';

export const ReplaysBrowser = ({ page, enabled, onTurnOn }: ReplaysBrowserProps) => {
  const t = useReplaysT();
  const [now] = useState(() => Math.floor(Date.now() / 1000));
  const browser = useReplaysBrowser({ page, enabled, now });
  const { view, selected } = browser;

  if (view === 'off') {
    return (
      <section aria-label={t('title')} className={s.browser}>
        <BrowserStatus text={t('offHint')} title={t('offTitle')}>
          <Button variant='accent' onClick={onTurnOn}>
            {t('turnOn')}
          </Button>
        </BrowserStatus>
      </section>
    );
  }

  return (
    <section aria-label={t('title')} className={s.browser}>
      <Toolbar browser={browser} />
      <FilterBar browser={browser} />
      <SummaryStrip browser={browser} />
      <div className={s.body}>
        {view === 'list' ? (
          <ReplayList
            items={browser.visible}
            label={t('title')}
            resetKey={JSON.stringify(browser.filters)}
            selectedId={selected?.id ?? null}
            onSelect={browser.select}
          />
        ) : (
          <ViewStatus browser={browser} />
        )}
        {selected && view === 'list' && <ReplayDetails browser={browser} item={selected} />}
      </div>
    </section>
  );
};
