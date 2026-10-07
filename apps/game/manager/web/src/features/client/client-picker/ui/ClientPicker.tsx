import { FolderOpen } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { Button, FormField, Select } from '@/ui-kit';

import { useClientPicker } from '../model/hooks';

import s from './ClientPicker.module.scss';

export const ClientPicker = () => {
  const t = useTranslations('client');
  const { options, clientPath, isPending, hasClients, onSelect, onAdd } = useClientPicker();

  return (
    <div className={s.root}>
      {hasClients && (
        <FormField label={t('select')}>
          {(control) => (
            <Select {...control} disabled={isPending} options={options} value={clientPath ?? ''} onChange={(event) => onSelect(event.target.value)} />
          )}
        </FormField>
      )}
      <Button isPending={isPending} variant={hasClients ? 'secondary' : 'primary'} onClick={onAdd}>
        <FolderOpen aria-hidden />
        {t('add')}
      </Button>
    </div>
  );
};
