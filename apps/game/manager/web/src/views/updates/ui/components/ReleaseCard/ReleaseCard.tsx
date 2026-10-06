import { useTranslations } from 'use-intl';

import { Badge, Card } from '@/ui-kit';

import type { ReleaseCardProps } from './ReleaseCard.types';

import { ReleaseChanges } from './components';

import s from './ReleaseCard.module.scss';

export const ReleaseCard = ({ release }: ReleaseCardProps) => {
  const t = useTranslations('whatsNew');

  return (
    <Card
      actions={release.isInstalled && <Badge tone='success'>{t('installed')}</Badge>}
      description={t('releaseMeta', { date: release.date, games: release.games })}
      title={t('release', { version: release.version })}
      tone={release.isInstalled ? 'accent' : 'default'}
    >
      {release.notes && <p className={s.notes}>{release.notes}</p>}
      {release.changes.length > 0 && <ReleaseChanges changes={release.changes} />}
    </Card>
  );
};
