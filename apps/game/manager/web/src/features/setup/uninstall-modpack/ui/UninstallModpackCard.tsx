import { Trash2 } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { Button, Card, Checkbox, ConfirmDialog } from '@/ui-kit';

import type { UninstallModpackCardProps } from './UninstallModpackCard.types';

import { useUninstallModpack } from '../model/hooks';

export const UninstallModpackCard = ({ clientPath }: UninstallModpackCardProps) => {
  const t = useTranslations('uninstall');
  const common = useTranslations('common');
  const { removeConfig, isPending, setRemoveConfig, onUninstall } = useUninstallModpack(clientPath);

  return (
    <Card
      actions={
        <ConfirmDialog
          trigger={
            <Button disabled={clientPath === null} isPending={isPending} variant='danger'>
              {!isPending && <Trash2 aria-hidden />}
              {t('action')}
            </Button>
          }
          cancelLabel={common('cancel')}
          confirmLabel={t('action')}
          description={t('description')}
          isPending={isPending}
          title={t('confirmTitle')}
          tone='danger'
          onConfirm={onUninstall}
        />
      }
      description={t('description')}
      title={t('title')}
    >
      <Checkbox checked={removeConfig} description={t('removeConfigDescription')} label={t('removeConfig')} onCheckedChange={setRemoveConfig} />
    </Card>
  );
};
