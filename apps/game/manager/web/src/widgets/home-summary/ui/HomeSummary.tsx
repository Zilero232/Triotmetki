import { Gamepad2, Layers, Package, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { Badge, Button } from '@/ui-kit';

import { useHomeSummary } from '../model/hooks';

import s from './HomeSummary.module.scss';

export const HomeSummary = () => {
  const t = useTranslations();
  const { client, installedVersion, versionBadge, enabledCount, totalCount, onOpenComponents, onChangeSelection } = useHomeSummary();

  return (
    <div className={s.root}>
      <dl className={s.tiles}>
        <div className={s.tile}>
          <dt className={s.label}>
            <Gamepad2 aria-hidden />
            {t('home.summary.game')}
          </dt>
          <dd className={s.value}>{client ? client.version : t('home.summary.noGame')}</dd>
          {client && (
            <dd className={s.meta}>
              <Badge>{t(`client.branch.${client.branch}`)}</Badge>
            </dd>
          )}
        </div>
        <div className={s.tile} data-accent={versionBadge.tone === 'premium' || undefined}>
          <dt className={s.label}>
            <Package aria-hidden />
            {t('home.summary.modpack')}
          </dt>
          <dd className={s.value}>{installedVersion ?? t('home.summary.notInstalled')}</dd>
          <dd className={s.meta}>
            <Badge tone={versionBadge.tone}>{versionBadge.label}</Badge>
          </dd>
        </div>
        <div className={s.tile}>
          <dt className={s.label}>
            <Layers aria-hidden />
            {t('home.summary.components')}
          </dt>
          <dd className={s.value}>{t('home.summary.enabled', { enabled: enabledCount, total: totalCount })}</dd>
          <dd className={s.meta}>{t('home.summary.enabledHint')}</dd>
        </div>
      </dl>
      <div className={s.actions}>
        <Button variant='secondary' onClick={onOpenComponents}>
          <Layers aria-hidden />
          {t('home.openComponents')}
        </Button>
        <Button variant='secondary' onClick={onChangeSelection}>
          <SlidersHorizontal aria-hidden />
          {t('home.changeSelection')}
        </Button>
      </div>
    </div>
  );
};
