import { ScrollText } from 'lucide-react';
import { useId } from 'react';
import { useTranslations } from 'use-intl';

import { useQueryLabels } from '@/shared/lib';
import { Badge, Card, EmptyState, HelpTip, Notice, PageHeader, QueryState } from '@/ui-kit';
import { PatchStatus } from '@/widgets/patch-status';

import { useUpdatesView } from '../model/hooks';

import s from './UpdatesView.module.scss';

export const UpdatesView = () => {
  const t = useTranslations();
  const historyId = useId();
  const queryLabels = useQueryLabels();
  const { whatsNewQuery, isOffline, releases } = useUpdatesView();

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
            releases.length > 0 ? (
              releases.map((release) => (
                <Card
                  key={release.version}
                  actions={release.isInstalled && <Badge tone='success'>{t('whatsNew.installed')}</Badge>}
                  description={t('whatsNew.releaseMeta', { date: release.date, games: release.games })}
                  title={t('whatsNew.release', { version: release.version })}
                  tone={release.isInstalled ? 'accent' : 'default'}
                >
                  {release.notes && <p className={s.notes}>{release.notes}</p>}
                  {release.changes.length > 0 && (
                    <>
                      <h3 className={s.changesTitle}>{t('whatsNew.changesTitle', { count: release.changes.length })}</h3>
                      <ul className={s.changes}>
                        {release.changes.map((change) => (
                          <li key={change.id} className={s.change}>
                            <div className={s.changeText}>
                              <span className={s.changeHead}>
                                {change.title}
                                {change.version && <Badge>{change.version}</Badge>}
                              </span>
                              {change.notes && <span className={s.changeNotes}>{change.notes}</span>}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </Card>
              ))
            ) : (
              <EmptyState hint={t('whatsNew.emptyHint')} icon={<ScrollText />} title={t('whatsNew.empty')} />
            )
          }
        </QueryState>
      </section>
    </>
  );
};
