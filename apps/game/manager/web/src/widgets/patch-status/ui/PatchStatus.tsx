import { useTranslations } from 'use-intl';

import { PatchActionButton } from '@/features/patch/patch-actions';
import { Badge, Card } from '@/ui-kit';

import { CARD_TONES } from '../config';
import { usePatchStatus } from '../model/hooks';

import s from './PatchStatus.module.scss';

export const PatchStatus = () => {
  const t = useTranslations('patch');
  const { clientPath, tone, action, title, hint, notes, checkedAt } = usePatchStatus();

  return (
    <Card
      actions={
        <>
          <PatchActionButton clientPath={clientPath} kind='check' />
          {action && <PatchActionButton clientPath={clientPath} kind={action} />}
        </>
      }
      title={t('title')}
      tone={CARD_TONES[tone]}
    >
      <div aria-live='polite' className={s.body}>
        <Badge tone={tone}>{title}</Badge>
        <p className={s.hint}>{hint}</p>
        {notes && (
          <div className={s.notes}>
            <span className={s.notesTitle}>{t('notes')}</span>
            <p>{notes}</p>
          </div>
        )}
        <span className={s.checked}>{checkedAt}</span>
      </div>
    </Card>
  );
};
