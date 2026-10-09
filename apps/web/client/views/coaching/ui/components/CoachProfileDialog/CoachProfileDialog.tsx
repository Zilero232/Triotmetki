'use client';

import { useTranslations } from 'next-intl';
import { Controller } from 'react-hook-form';

import { FormDialog } from '@/features/community/form-dialog';
import { buttonVariants, ErrorState, Select } from '@/ui-kit';

import { useCoachProfileForm } from '../../../model/hooks';
import { CoachAboutFields, CoachActiveField, CoachContactsFields, CoachTanksField } from './components';

export const CoachProfileDialog = () => {
  const t = useTranslations('coaching.profile');
  const { dialog, accounts, isSignedIn, hasProfile, isLoading, isLoadFailed, isRetrying, retry } = useCoachProfileForm();

  if (!isSignedIn) {
    return null;
  }

  if (isLoadFailed) {
    return <ErrorState isCompact isRetrying={isRetrying} title={t('loadError')} onRetry={retry} />;
  }

  return (
    <FormDialog
      dialog={dialog}
      isTriggerDisabled={isLoading}
      namespace={hasProfile ? 'coaching.profile.dialog.edit' : 'coaching.profile.dialog.become'}
      triggerClassName={buttonVariants({ size: 'sm', variant: hasProfile ? 'secondary' : 'primary' })}
    >
      <Controller
        render={({ field }) => (
          <Select
            items={accounts.map(({ accountId, nickname }) => ({ value: String(accountId), label: nickname }))}
            label={t('account')}
            value={field.value}
            onValueChange={field.onChange}
          />
        )}
        control={dialog.form.control}
        name='accountId'
      />
      <CoachAboutFields />
      <CoachTanksField />
      <CoachContactsFields />
      <CoachActiveField />
    </FormDialog>
  );
};
