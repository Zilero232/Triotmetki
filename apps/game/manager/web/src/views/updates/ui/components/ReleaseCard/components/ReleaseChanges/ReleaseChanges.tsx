import { useTranslations } from 'use-intl';

import { Badge } from '@/ui-kit';

import type { ReleaseChangesProps } from './ReleaseChanges.types';

import s from './ReleaseChanges.module.scss';

export const ReleaseChanges = ({ changes }: ReleaseChangesProps) => {
  const t = useTranslations('whatsNew');

  return (
    <>
      <h3 className={s.title}>{t('changesTitle', { count: changes.length })}</h3>
      <ul className={s.changes}>
        {changes.map((change) => (
          <li key={change.id} className={s.change}>
            <div className={s.text}>
              <span className={s.head}>
                {change.title}
                {change.version && <Badge>{change.version}</Badge>}
              </span>
              {change.notes && <span className={s.notes}>{change.notes}</span>}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
};
