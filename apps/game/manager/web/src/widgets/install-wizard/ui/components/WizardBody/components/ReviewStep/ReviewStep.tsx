import { Pencil } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { BLOCKER_MESSAGES, INSTALL_WIZARD, useInstallWizard } from '@/features/setup/install-modpack';
import { Badge, Button, Card, Notice, Spinner } from '@/ui-kit';

import s from './ReviewStep.module.scss';

export const ReviewStep = () => {
  const t = useTranslations('install');
  const { plan, chosenGroups, selectedCount, removeOthers, dependencyCount, isReinstall, parkedCount, blocker, isInstalling, goTo } =
    useInstallWizard();

  return (
    <Card title={t('steps.review')}>
      {blocker && (
        <Notice title={t('blocked')} tone='danger'>
          {t(BLOCKER_MESSAGES[blocker])}
        </Notice>
      )}
      {isInstalling && (
        <Notice title={t('installing')}>
          <span className={s.progress}>
            <Spinner size='sm' />
            {t('installingHint')}
          </span>
        </Notice>
      )}
      {chosenGroups.length > 0 && (
        <section className={s.section}>
          <header className={s.sectionHeader}>
            <h3 className={s.sectionTitle}>
              {t('reviewWhat')} <Badge tone='accent'>{selectedCount}</Badge>
            </h3>
            <Button disabled={isInstalling} size='sm' variant='ghost' onClick={() => goTo(INSTALL_WIZARD.steps.indexOf('components'))}>
              <Pencil aria-hidden />
              {t('edit')}
            </Button>
          </header>
          <dl className={s.groups}>
            {chosenGroups.map((group) => (
              <div key={group.id} className={s.group}>
                <dt>{group.title}</dt>
                <dd>
                  {group.components.map((component) => (
                    <Badge key={component.id} tone={component.required ? 'accent' : 'neutral'}>
                      {component.title}
                    </Badge>
                  ))}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      )}
      <ul className={s.summary}>
        {plan && (
          <li>
            {t('reviewWhere')}: {t('reviewClient', { version: plan.client.version })} <span className={s.path}>{plan.client.modsDir}</span>
          </li>
        )}
        {dependencyCount > 0 && <li>{t('reviewDependencies', { count: dependencyCount })}</li>}
        {isReinstall && <li className={s.warning}>{t('reviewReinstall', { count: parkedCount })}</li>}
        {removeOthers.size > 0 && <li className={s.danger}>{t('reviewRemove', { count: removeOthers.size })}</li>}
        {plan && <li>{t(`source.${plan.source}`, { version: plan.release?.version ?? '' })}</li>}
      </ul>
    </Card>
  );
};
