'use client';

import { Monitor, Unplug } from 'lucide-react';
import { useFormatter, useTranslations } from 'next-intl';

import { useClientNow } from '@/shared/lib';
import { Button, ConfirmDialog } from '@/ui-kit';

import type { DeviceListProps } from './DeviceList.types';

import s from './DeviceList.module.scss';

export const DeviceList = ({ devices, revokingId, onRevoke }: DeviceListProps) => {
  const t = useTranslations('me.mod');
  const format = useFormatter();
  const now = useClientNow({ updateInterval: 60_000 });

  return (
    <section className={s.root}>
      <h3 className={s.heading}>{t('devices')}</h3>
      {devices.length === 0 && <p className={s.empty}>{t('noDevices')}</p>}
      <ul className={s.list}>
        {devices.map(({ id, name, modVersion, lastSeenAt }) => (
          <li key={id} className={s.row}>
            <Monitor className={s.icon} size={16} />
            <span className={s.text}>
              <span className={s.name}>{name ?? id}</span>
              <span className={s.meta}>
                {t('deviceMeta', { version: modVersion ?? '—', seen: lastSeenAt && now ? format.relativeTime(new Date(lastSeenAt), now) : '—' })}
              </span>
            </span>
            <ConfirmDialog
              trigger={
                <Button disabled={revokingId === id} size='sm' variant='ghost'>
                  <Unplug size={14} />
                  {t('revoke')}
                </Button>
              }
              cancelLabel={t('cancel')}
              confirmLabel={t('revoke')}
              description={t('revokeDescription')}
              isPending={revokingId === id}
              title={t('revokeTitle', { name: name ?? id })}
              tone='danger'
              onConfirm={() => onRevoke(id)}
            />
          </li>
        ))}
      </ul>
    </section>
  );
};
