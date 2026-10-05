import { useTranslations } from 'use-intl';

import { NameForm } from '@/ui-kit';

import type { SaveProfileFormProps } from './SaveProfileForm.types';

import { useSaveProfileForm } from '../model/hooks';

import s from './SaveProfileForm.module.scss';

export const SaveProfileForm = ({ clientPath, components, disabled }: SaveProfileFormProps) => {
  const t = useTranslations('profiles');
  const { field, error, isPending, onSubmit } = useSaveProfileForm({ clientPath, components });

  return (
    <NameForm
      className={s.root}
      disabled={disabled}
      error={error}
      field={field}
      isPending={isPending}
      label={t('name')}
      placeholder={t('namePlaceholder')}
      submitLabel={t('save')}
      onSubmit={onSubmit}
    />
  );
};
