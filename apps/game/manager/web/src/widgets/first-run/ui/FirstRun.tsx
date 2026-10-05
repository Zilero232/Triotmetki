import { Check, Layers, Package, PackageCheck, SlidersHorizontal } from 'lucide-react';
import { useTranslations } from 'use-intl';

import { ClientPicker } from '@/features/client/client-picker';
import { BLOCKER_MESSAGES } from '@/features/setup/install-modpack';
import { useQueryLabels } from '@/shared/lib';
import { Button, Card, Notice, QueryState } from '@/ui-kit';

import { useFirstRun } from '../model/hooks';
import { SetupStep } from './components';

import s from './FirstRun.module.scss';

export const FirstRun = () => {
  const t = useTranslations();
  const queryLabels = useQueryLabels();
  const {
    clientsQuery,
    planQuery,
    client,
    hasClient,
    presets,
    selectedTitle,
    selectedCount,
    releaseVersion,
    blocker,
    canInstall,
    isGameDone,
    isPresetDone,
    errorMessage,
    onSelectPreset,
    onQuickInstall,
    onCustomize
  } = useFirstRun();

  const doneLabel = t('home.setup.stepDone');

  return (
    <Card description={t('home.setup.description')} title={t('home.setup.title')}>
      <ol className={s.steps}>
        <SetupStep doneLabel={doneLabel} index={1} isDone={isGameDone} title={t('home.setup.stepGame')}>
          <QueryState errorMessage={errorMessage} {...queryLabels} query={clientsQuery}>
            {() => (
              <>
                {client ? (
                  <p className={s.found}>
                    {t('home.setup.gameFound', { version: client.version })}
                    <span className={s.path}>{client.path}</span>
                  </p>
                ) : (
                  <Notice title={t('home.setup.gameMissing')} tone='warning'>
                    {t('home.setup.gameMissingHint')}
                  </Notice>
                )}
                <ClientPicker />
              </>
            )}
          </QueryState>
        </SetupStep>
        <SetupStep doneLabel={doneLabel} index={2} isDone={isPresetDone} title={t('home.setup.stepPreset')}>
          {hasClient ? (
            <QueryState errorMessage={errorMessage} {...queryLabels} query={planQuery}>
              {() =>
                blocker ? (
                  <Notice title={t('install.blocked')} tone='danger'>
                    {t(`install.${BLOCKER_MESSAGES[blocker]}`)}
                  </Notice>
                ) : (
                  <div aria-label={t('home.setup.presetsLabel')} className={s.presets} role='radiogroup'>
                    {presets.map((preset) => (
                      <button
                        key={preset.id}
                        aria-checked={preset.isSelected}
                        className={s.preset}
                        role='radio'
                        type='button'
                        onClick={() => onSelectPreset(preset.id)}
                      >
                        <span className={s.presetHead}>
                          <span className={s.presetTitle}>{preset.title}</span>
                          <span aria-hidden className={s.presetCheck}>
                            <Check strokeWidth={3} />
                          </span>
                        </span>
                        {preset.description && <span className={s.presetText}>{preset.description}</span>}
                        <span className={s.presetCount}>
                          <Layers aria-hidden />
                          {t('home.setup.presetCount', { count: preset.count })}
                        </span>
                      </button>
                    ))}
                  </div>
                )
              }
            </QueryState>
          ) : (
            <p className={s.muted}>{t('home.setup.chooseGameFirst')}</p>
          )}
        </SetupStep>
        <SetupStep doneLabel={doneLabel} index={3} title={t('home.setup.stepInstall')}>
          {releaseVersion && (
            <div className={s.release}>
              <Package aria-hidden className={s.releaseIcon} />
              <div className={s.releaseText}>
                <span className={s.releaseVersion}>{t('home.setup.release', { version: releaseVersion })}</span>
                {canInstall && client && (
                  <span className={s.releaseMeta}>{t('home.setup.releaseMeta', { count: selectedCount, game: client.version })}</span>
                )}
              </div>
            </div>
          )}
          <div className={s.actions}>
            <Button disabled={!canInstall} size='lg' onClick={onQuickInstall}>
              <PackageCheck aria-hidden />
              {selectedTitle ? t('home.setup.quickInstall', { preset: selectedTitle }) : t('home.installCta')}
            </Button>
            <Button disabled={!canInstall} size='lg' variant='secondary' onClick={onCustomize}>
              <SlidersHorizontal aria-hidden />
              {t('home.setup.customize')}
            </Button>
          </div>
          <p className={s.muted}>{t('home.setup.installHint')}</p>
        </SetupStep>
      </ol>
    </Card>
  );
};
