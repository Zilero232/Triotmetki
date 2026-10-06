import { ScrollText } from 'lucide-react';
import { useId } from 'react';
import { useTranslations } from 'use-intl';

import { useQueryLabels } from '@/shared/lib';
import { EmptyState, HelpTip, Notice, PageHeader, QueryState } from '@/ui-kit';
import { PatchStatus } from '@/widgets/patch-status';

import { useUpdatesView } from '../model/hooks';
import { ReleaseCard } from './components';

import s from './UpdatesView.module.scss';

export const UpdatesView = () => {
  const t = useTranslations();
  const historyId = useId();
  const queryLabels = useQueryLabels();
  const { whatsNewQuery, isOffline, isEmpty, releases } = useUpdatesView();

  return (
    <>
      <PageHeader
        description={t('updates.description')}
        help={<HelpTip label={t('help.tipLabel')}>{t('help.tips.updates')}</HelpTip>}
        title={t('updates.title')}
      />
      <PatchStatus />
      <section aria-labelledby={historyId} className={s.history}>
        <h2 className={s.historyTitle} id={historyId}>
          {t('whatsNew.title')}
        </h2>
        {isOffline && <Notice tone='warning'>{t('whatsNew.offline')}</Notice>}
        <QueryState {...queryLabels} query={whatsNewQuery}>
          {() =>
            isEmpty ? (
              <EmptyState hint={t('whatsNew.emptyHint')} icon={<ScrollText />} title={t('whatsNew.empty')} />
            ) : (
              releases.map((release) => <ReleaseCard key={release.version} release={release} />)
            )
          }
        </QueryState>
      </section>
    </>
  );
};
