import { HardDriveDownload, Search, Trash2 } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { Badge, Button, Checkbox, ConfirmDialog, EmptyState } from '@/ui-kit';

import { useClearCache } from '../model/hooks';

import s from './ClearCache.module.scss';

export const ClearCache = () => {
  const t = useTranslations();
  const { isScanned, isScanning, isClearing, rows, chosenCount, chosenSize, canClear, canScan, onScan, onToggle, onClear } = useClearCache();

  return (
    <div className={s.root}>
      <p className={s.hint}>{t('settings.cache.hint')}</p>
      <div className={s.actions}>
        <Button disabled={!canScan} isPending={isScanning} variant='secondary' onClick={onScan}>
          <Search aria-hidden />
          {t('settings.cache.scan')}
        </Button>
        {isScanned && rows.length > 0 && (
          <ConfirmDialog
            trigger={
              <Button disabled={!canClear} isPending={isClearing}>
                <Trash2 aria-hidden />
                {t('settings.cache.clear', { size: chosenSize })}
              </Button>
            }
            cancelLabel={t('common.cancel')}
            confirmLabel={t('settings.cache.confirm')}
            description={t('settings.cache.confirmDescription')}
            isPending={isClearing}
            title={t('settings.cache.confirmTitle', { count: chosenCount, size: chosenSize })}
            tone='danger'
            onConfirm={onClear}
          />
        )}
      </div>
      {isScanned &&
        (rows.length > 0 ? (
          <ul className={s.list}>
            {rows.map((row) => (
              <li key={row.id} className={s.row}>
                <Checkbox
                  checked={row.checked}
                  description={row.path}
                  label={row.name}
                  onCheckedChange={(checked) => onToggle({ id: row.id, checked })}
                />
                <span className={s.meta}>
                  <Badge>{t(`settings.cache.location.${row.location}`)}</Badge>
                  {row.size}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState icon={<HardDriveDownload />} title={t('settings.cache.empty')} />
        ))}
    </div>
  );
};
