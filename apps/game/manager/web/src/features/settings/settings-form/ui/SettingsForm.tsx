import { Controller } from 'react-hook-form';
import { useTranslations } from 'use-intl';

import { Button, Card, FormField, Select, Switch } from '@/ui-kit';

import type { SettingsFormProps } from './SettingsForm.types';

import { useSettingsForm } from '../model/hooks';

import s from './SettingsForm.module.scss';

export const SettingsForm = ({ settings }: SettingsFormProps) => {
  const t = useTranslations('settings');
  const { control, register, intervalOptions, languageOptions, isDirty, isPending, onSubmit } = useSettingsForm(settings);

  return (
    <form className={s.root} onSubmit={onSubmit}>
      <Card title={t('backgroundTitle')}>
        <Controller
          render={({ field }) => (
            <Switch checked={field.value} description={t('autostartHint')} label={t('autostart')} onCheckedChange={field.onChange} />
          )}
          control={control}
          name='autostart'
        />
        <Controller
          render={({ field }) => (
            <Switch checked={field.value} description={t('notificationsHint')} label={t('notifications')} onCheckedChange={field.onChange} />
          )}
          control={control}
          name='notifications'
        />
        <Controller
          render={({ field }) => (
            <Switch checked={field.value} description={t('autoMigrateHint')} label={t('autoMigrate')} onCheckedChange={field.onChange} />
          )}
          control={control}
          name='autoMigrate'
        />
        <div className={s.fields}>
          <FormField label={t('interval')}>
            {(field) => <Select {...field} {...register('checkIntervalMinutes', { valueAsNumber: true })} options={intervalOptions} />}
          </FormField>
        </div>
      </Card>
      <Card title={t('interfaceTitle')}>
        <div className={s.fields}>
          <FormField label={t('language')}>{(field) => <Select {...field} {...register('language')} options={languageOptions} />}</FormField>
        </div>
      </Card>
      <div className={s.actions}>
        <Button disabled={!isDirty} isPending={isPending} type='submit'>
          {t('save')}
        </Button>
      </div>
    </form>
  );
};
