import { FolderDown, MessageSquareWarning, Send } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { useQueryLabels } from '@/shared/lib';
import {
  Button,
  Checkbox,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  FormField,
  QueryState,
  TextArea
} from '@/ui-kit';

import { REPORT } from '../config';
import { useReportForm } from '../model/hooks';

import s from './ReportProblemButton.module.scss';

export const ReportProblemButton = () => {
  const t = useTranslations('report');
  const queryLabels = useQueryLabels();
  const {
    open,
    previewQuery,
    rows,
    register,
    errors,
    consent,
    canSubmit,
    isSending,
    isSaving,
    onOpenChange,
    onToggle,
    onConsentChange,
    onSend,
    onSave
  } = useReportForm();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger
        render={
          <Button variant='secondary'>
            <MessageSquareWarning aria-hidden />
            {t('open')}
          </Button>
        }
      />
      <DialogContent size='lg'>
        <DialogHeader>
          <DialogTitle>{t('title')}</DialogTitle>
          <DialogDescription>{t('description')}</DialogDescription>
        </DialogHeader>
        <QueryState {...queryLabels} loadingLabel={t('collecting')} query={previewQuery}>
          {() => (
            <form className={s.form} onSubmit={onSend}>
              <p className={s.privacy}>{t('privacy')}</p>
              <ul className={s.items}>
                {rows.map((row) => (
                  <li key={row.part} className={s.item}>
                    <Checkbox
                      checked={row.checked}
                      description={t('itemMeta', { name: row.name, size: row.size, redactions: row.redactions })}
                      label={t(`parts.${row.part}`)}
                      onCheckedChange={(checked) => onToggle({ part: row.part, checked })}
                    />
                    <details className={s.details}>
                      <summary>{row.truncated ? t('showTail') : t('show')}</summary>
                      <pre className={s.text}>{row.text}</pre>
                    </details>
                  </li>
                ))}
              </ul>
              <FormField error={errors.message} label={t('message')}>
                {(control) => (
                  <TextArea {...control} {...register('message')} maxLength={REPORT.messageMaxLength} placeholder={t('messagePlaceholder')} />
                )}
              </FormField>
              <Checkbox checked={consent} description={t('consentHint')} label={t('consent')} onCheckedChange={onConsentChange} />
              {errors.consent && (
                <p className={s.error} role='alert'>
                  {errors.consent}
                </p>
              )}
              <DialogFooter>
                <Button disabled={!canSubmit} isPending={isSaving} variant='ghost' onClick={onSave}>
                  {!isSaving && <FolderDown aria-hidden />}
                  {t('saveZip')}
                </Button>
                <Button disabled={!canSubmit} isPending={isSending} type='submit'>
                  {!isSending && <Send aria-hidden />}
                  {t('send')}
                </Button>
              </DialogFooter>
            </form>
          )}
        </QueryState>
      </DialogContent>
    </Dialog>
  );
};
