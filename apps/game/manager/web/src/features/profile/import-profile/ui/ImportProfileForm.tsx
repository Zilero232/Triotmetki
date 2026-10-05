import { FileUp, Import } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { Button, FormField, TextInput } from '@/ui-kit';

import type { ImportProfileFormProps } from './ImportProfileForm.types';

import { useImportProfileForm } from '../model/hooks';

import s from './ImportProfileForm.module.scss';

export const ImportProfileForm = ({ clientPath, initialCode, disabled }: ImportProfileFormProps) => {
  const t = useTranslations('profiles');
  const { register, errors, isPending, isFilePending, onSubmit, onImportFile } = useImportProfileForm({ clientPath, initialCode });

  return (
    <div className={s.wrap}>
      <form className={s.root} onSubmit={onSubmit}>
        <FormField error={errors.code} hint={initialCode ? t('fromLink') : undefined} label={t('code')}>
          {(control) => (
            <TextInput
              {...control}
              {...register('code')}
              autoComplete='off'
              disabled={disabled}
              placeholder={t('codePlaceholder')}
              spellCheck={false}
            />
          )}
        </FormField>
        <FormField error={errors.name} label={t('importName')}>
          {(control) => <TextInput {...control} {...register('name')} autoComplete='off' disabled={disabled} />}
        </FormField>
        <Button disabled={disabled} isPending={isPending} type='submit' variant='secondary'>
          <Import aria-hidden />
          {t('import')}
        </Button>
      </form>
      <div className={s.files}>
        <Button disabled={disabled} isPending={isFilePending} variant='ghost' onClick={onImportFile}>
          <FileUp aria-hidden />
          {t('importFile')}
        </Button>
      </div>
    </div>
  );
};
