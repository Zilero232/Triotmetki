import { ScrollText } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { useQueryLabels } from '@/shared/lib';
import { Badge, Card, EmptyState, Notice, PageHeader, QueryState } from '@/ui-kit';
import { SectionTabs } from '@/widgets/section-tabs';

import { useChangelogView } from '../model/hooks';

import s from './ChangelogView.module.scss';

export const ChangelogView = () => {
  const t = useTranslations('whatsNew');
  const queryLabels = useQueryLabels();
  const { whatsNewQuery, isOffline, releases } = useChangelogView();

  return (
    <>
      <SectionTabs section='maintenance' />
      <PageHeader description={t('description')} title={t('title')} />
      {isOffline && <Notice tone='warning'>{t('offline')}</Notice>}
      <QueryState {...queryLabels} query={whatsNewQuery}>
        {() =>
          releases.length > 0 ? (
            releases.map((release) => (
              <Card
                key={release.version}
                actions={release.isInstalled && <Badge tone='success'>{t('installed')}</Badge>}
                description={t('releaseMeta', { date: release.date, games: release.games })}
                title={t('release', { version: release.version })}
                tone={release.isInstalled ? 'accent' : 'default'}
              >
                {release.notes && <p className={s.notes}>{release.notes}</p>}
                {release.changes.length > 0 && (
                  <>
                    <h3 className={s.changesTitle}>{t('changesTitle', { count: release.changes.length })}</h3>
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
            <EmptyState hint={t('emptyHint')} icon={<ScrollText />} title={t('empty')} />
          )
        }
      </QueryState>
    </>
  );
};
