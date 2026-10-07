import { PackagePlus, SlidersHorizontal } from 'lucide-react';
import { useId } from 'react';
import { useTranslations } from 'use-intl';

import { ClientPicker } from '@/features/client/client-picker';
import { ClearCache } from '@/features/settings/clear-cache';
import { UninstallModpackCard } from '@/features/setup/uninstall-modpack';
import { Button, Card, HelpTip, PageColumns, PageHeader } from '@/ui-kit';
import { ConflictReport } from '@/widgets/conflict-report';

import { useMaintenanceView } from '../model/hooks';

import s from './MaintenanceView.module.scss';

export const MaintenanceView = () => {
  const t = useTranslations();
  const dangerId = useId();
  const { clientPath, isInstalled, onChangeSelection } = useMaintenanceView();

  return (
    <>
      <PageHeader
        description={t('maintenance.description')}
        help={<HelpTip label={t('help.tipLabel')}>{t('help.tips.maintenance')}</HelpTip>}
        title={t('maintenance.title')}
      />
      <PageColumns
        aside={
          <>
            <Card
              actions={
                <Button variant='secondary' onClick={onChangeSelection}>
                  {isInstalled ? <SlidersHorizontal aria-hidden /> : <PackagePlus aria-hidden />}
                  {isInstalled ? t('home.changeSelection') : t('home.installCta')}
                </Button>
              }
              description={t('maintenance.selectionDescription')}
              title={t('maintenance.selectionTitle')}
            />
            <Card title={t('settings.cache.title')}>
              <ClearCache />
            </Card>
            <section aria-labelledby={dangerId} className={s.danger}>
              <h2 className={s.dangerTitle} id={dangerId}>
                {t('maintenance.dangerZone')}
              </h2>
              <UninstallModpackCard clientPath={clientPath} isInstalled={isInstalled} />
            </section>
          </>
        }
      >
        <Card description={t('maintenance.gameDescription')} title={t('maintenance.gameTitle')}>
          <ClientPicker />
        </Card>
        <ConflictReport />
      </PageColumns>
    </>
  );
};
