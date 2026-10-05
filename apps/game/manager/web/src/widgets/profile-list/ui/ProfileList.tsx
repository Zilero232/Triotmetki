import { UserRoundCog } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { ProfileActions } from '@/features/profile/profile-actions';
import { useQueryLabels } from '@/shared/lib';
import { Badge, Card, EmptyState, QueryState } from '@/ui-kit';

import { useProfileList } from '../model/hooks';

import s from './ProfileList.module.scss';

export const ProfileList = () => {
  const t = useTranslations();
  const queryLabels = useQueryLabels();
  const { clientPath, profilesQuery, count, max, rows } = useProfileList();

  return (
    <Card actions={max > 0 && <Badge>{t('profiles.count', { count, max })}</Badge>} title={t('profiles.title')}>
      <QueryState {...queryLabels} query={profilesQuery}>
        {() =>
          rows.length > 0 ? (
            <ul className={s.list}>
              {rows.map(({ profile, meta }) => (
                <li key={profile.id} className={s.row} data-active={profile.active || undefined}>
                  <div className={s.text}>
                    <span className={s.name}>
                      {profile.name}
                      {profile.active && <Badge tone='accent'>{t('profiles.active')}</Badge>}
                    </span>
                    <span className={s.meta}>{meta}</span>
                  </div>
                  <ProfileActions clientPath={clientPath} profile={profile} />
                </li>
              ))}
            </ul>
          ) : (
            <EmptyState hint={t('profiles.emptyHint')} icon={<UserRoundCog />} title={t('profiles.empty')} />
          )
        }
      </QueryState>
    </Card>
  );
};
