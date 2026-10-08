'use client';

import { PLUS_LIMITS } from '@otmetki/schemas';
import { useTranslations } from 'next-intl';
import { FormProvider } from 'react-hook-form';

import { Button } from '@/ui-kit';

import type { OverlayEditorProps } from './OverlayEditor.types';

import { useOverlayForm } from '../../../model/hooks';
import { ConfirmAction } from '../ConfirmAction';
import { OverlayBasicsFields } from '../OverlayBasicsFields';
import { OverlayMetricsField } from '../OverlayMetricsField';
import { OverlayObsHint } from '../OverlayObsHint';
import { OverlayPreview } from '../OverlayPreview';
import { OverlayStyleFields } from '../OverlayStyleFields';
import { OverlayTogglesFields } from '../OverlayTogglesFields';

import s from './OverlayEditor.module.scss';

export const OverlayEditor = ({ overlay, onSaved, onRemoved }: OverlayEditorProps) => {
  const t = useTranslations('streamer.overlays');
  const { form, layout, isSaving, isRemoving, onSubmit, onRemove } = useOverlayForm({ overlay, onSaved, onRemoved });

  return (
    <FormProvider {...form}>
      <form noValidate className={s.root} onSubmit={onSubmit}>
        <div className={s.controls}>
          <OverlayBasicsFields />
          <OverlayMetricsField />
          <OverlayStyleFields />
          <OverlayTogglesFields />
          <footer className={s.footer}>
            <Button disabled={isSaving} type='submit'>
              {overlay ? t('save') : t('create')}
            </Button>
            {overlay && (
              <ConfirmAction
                confirmLabel={t('remove')}
                description={t('removeDescription', { name: overlay.name })}
                isPending={isRemoving}
                title={t('removeTitle')}
                triggerLabel={t('remove')}
                onConfirm={onRemove}
              />
            )}
          </footer>
        </div>
        <div className={s.stage}>
          {overlay?.isPaused && (
            <p className={s.paused} role='status'>
              {t('pausedHint', { limit: PLUS_LIMITS.overlays.free })}
            </p>
          )}
          <OverlayPreview accountId={overlay?.accountId ?? null} />
          {overlay && <OverlayObsHint layout={layout} publicUrl={overlay.publicUrl} />}
        </div>
      </form>
    </FormProvider>
  );
};
