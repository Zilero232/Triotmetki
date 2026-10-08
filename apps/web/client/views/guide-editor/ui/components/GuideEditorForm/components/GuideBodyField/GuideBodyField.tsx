'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import { MarkdownEditor } from '@/features/community/markdown-editor';
import { FormField } from '@/ui-kit';

import { useGuideBodyField } from '../../../../../model/hooks';

export const GuideBodyField = () => {
  const t = useTranslations('guides.editor');
  const { control, length, max, min, isInvalid } = useGuideBodyField();

  return (
    <FormField
      error={isInvalid && t('errors.body', { min, max: max ?? length })}
      hint={t('counter', { length, max: max ?? length })}
      label={t('body')}
    >
      <Controller
        render={({ field, fieldState }) => (
          <MarkdownEditor isInvalid={fieldState.invalid} markdown={field.value} placeholder={t('bodyPlaceholder')} onChange={field.onChange} />
        )}
        control={control}
        name='body'
      />
    </FormField>
  );
};
