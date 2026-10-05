'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import { Button, buttonVariants, DialogClose, DialogFooter, Switch, ToggleChips } from '@/ui-kit';

import type { ApplySettingsFormProps } from './ApplySettingsForm.types';

import s from './ApplySettingsForm.module.scss';

export const ApplySettingsForm = ({ form, groupOptions, options, isPending, onSubmit }: ApplySettingsFormProps) => {
  const t = useTranslations('streamerSettings.apply');

  return (
    <form noValidate className={s.root} onSubmit={onSubmit}>
      <Controller
        render={({ field, fieldState }) => (
          <div className={s.field}>
            <span className={s.label}>{t('groups')}</span>
            <ToggleChips aria-label={t('groups')} options={groupOptions} size='sm' value={field.value} onChange={field.onChange} />
            {fieldState.error && <span className={s.error}>{t('groupsError')}</span>}
          </div>
        )}
        control={form.control}
        name='groups'
      />
      {options.hasResolution && (
        <Controller
          render={({ field }) => (
            <Switch checked={field.value} description={t('resolutionHint')} label={t('includeResolution')} onCheckedChange={field.onChange} />
          )}
          control={form.control}
          name='includeResolution'
        />
      )}
      {options.hasSensitivity && (
        <Controller
          render={({ field }) => (
            <Switch checked={field.value} description={t('sensitivityHint')} label={t('includeSensitivity')} onCheckedChange={field.onChange} />
          )}
          control={form.control}
          name='includeSensitivity'
        />
      )}
      <ul className={s.notes}>
        <li>{t('notes.hangar')}</li>
        <li>{t('notes.noUndo')}</li>
      </ul>
      <DialogFooter>
        <DialogClose className={buttonVariants({ variant: 'ghost', size: 'sm' })}>{t('cancel')}</DialogClose>
        <Button disabled={isPending} size='sm' type='submit'>
          {t('submit')}
        </Button>
      </DialogFooter>
    </form>
  );
};
