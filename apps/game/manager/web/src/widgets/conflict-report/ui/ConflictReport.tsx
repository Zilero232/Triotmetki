import { RefreshCw, ShieldCheck, TriangleAlert } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { RestoreMissingButton } from '@/features/conflict/restore-missing';
import { useQueryLabels } from '@/shared/lib';
import { Button, Card, QueryState } from '@/ui-kit';

import type { ConflictReportProps } from './ConflictReport.types';

import { useConflictReport } from '../model/hooks';

import s from './ConflictReport.module.scss';

export const ConflictReport = ({ hideWhenClean = false }: ConflictReportProps) => {
  const t = useTranslations();
  const queryLabels = useQueryLabels();
  const { clientPath, conflictsQuery, items, isVisible, restorable, hasMissing, isChecking, onRecheck } = useConflictReport({ hideWhenClean });

  if (!isVisible) {
    return null;
  }

  return (
    <Card
      actions={
        <div className={s.actions}>
          {hasMissing && <RestoreMissingButton clientPath={clientPath} count={restorable} />}
          <Button isPending={isChecking} size='sm' variant='ghost' onClick={onRecheck}>
            <RefreshCw aria-hidden />
            {t('conflicts.recheck')}
          </Button>
        </div>
      }
      description={t('conflicts.description')}
      title={t('conflicts.title')}
      tone={items.length > 0 ? 'warning' : 'default'}
    >
      <QueryState {...queryLabels} query={conflictsQuery}>
        {() =>
          items.length > 0 ? (
            <ul className={s.list}>
              {items.map((item) => (
                <li key={item.key} className={s.item}>
                  <TriangleAlert aria-hidden className={s.icon} />
                  <div className={s.text}>
                    <strong>{t(`conflicts.kind.${item.kind}`, { subject: item.subject, count: item.count })}</strong>
                    {item.components.length > 0 && <span>{t('conflicts.components', { list: item.components.join(', ') })}</span>}
                    {item.note && <span className={s.note}>{item.note}</span>}
                    {item.files.length > 0 && <code className={s.files}>{item.files.join(', ')}</code>}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className={s.clean}>
              <ShieldCheck aria-hidden />
              {t('conflicts.clean')}
            </p>
          )
        }
      </QueryState>
    </Card>
  );
};
