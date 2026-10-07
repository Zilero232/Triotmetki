import { ArrowLeft, ArrowRight, PackageCheck } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { useInstallWizard } from '@/features/setup/install-modpack';
import { Button, ConfirmDialog } from '@/ui-kit';

import s from './WizardFooter.module.scss';

export const WizardFooter = () => {
  const t = useTranslations();
  const { isFirstStep, isLastStep, canInstall, isInstalling, removeOthers, goBack, goNext, onCancel, onInstall } = useInstallWizard();

  return (
    <div className={s.root}>
      {isFirstStep ? (
        <Button variant='ghost' onClick={onCancel}>
          {t('common.cancel')}
        </Button>
      ) : (
        <Button disabled={isInstalling} variant='ghost' onClick={goBack}>
          <ArrowLeft aria-hidden />
          {t('install.back')}
        </Button>
      )}
      {!isLastStep && (
        <Button disabled={!canInstall} onClick={goNext}>
          {t('install.next')}
          <ArrowRight aria-hidden />
        </Button>
      )}
      {isLastStep && removeOthers.size === 0 && (
        <Button disabled={!canInstall} isPending={isInstalling} onClick={onInstall}>
          {!isInstalling && <PackageCheck aria-hidden />}
          {t('install.install')}
        </Button>
      )}
      {isLastStep && removeOthers.size > 0 && (
        <ConfirmDialog
          trigger={
            <Button disabled={!canInstall} isPending={isInstalling}>
              {!isInstalling && <PackageCheck aria-hidden />}
              {t('install.install')}
            </Button>
          }
          cancelLabel={t('common.cancel')}
          confirmLabel={t('install.install')}
          description={t('install.confirmRemoveDescription')}
          isPending={isInstalling}
          title={t('install.confirmRemoveTitle', { count: removeOthers.size })}
          tone='danger'
          onConfirm={onInstall}
        />
      )}
    </div>
  );
};
