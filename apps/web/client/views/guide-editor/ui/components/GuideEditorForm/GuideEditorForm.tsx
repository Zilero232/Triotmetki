'use client';

import { useTranslations } from 'next-intl';
import { useId } from 'react';
import { Controller, FormProvider } from 'react-hook-form';

import { TankPicker } from '@/features/tank/pick-tank';
import { Link } from '@/shared/i18n/navigation';
import { Button, buttonVariants, Card, FormField, FormFooter, Input, SegmentedControl, Select } from '@/ui-kit';

import type { GuideEditorFormProps } from './GuideEditorForm.types';

import { GUIDE_FORM } from '../../../config';
import { useGuideEditorForm } from '../../../model/hooks';
import { GuideBodyField } from './components';

import s from './GuideEditorForm.module.scss';

export const GuideEditorForm = ({ guide }: GuideEditorFormProps) => {
  const t = useTranslations('guides.editor');
  const titleId = useId();
  const {
    form,
    kind,
    kindOptions,
    localeOptions,
    tank,
    onTankChange,
    map,
    mapItems,
    onMapChange,
    titleLength,
    titleMax,
    isPending,
    submitLabel,
    cancelHref,
    onSubmit
  } = useGuideEditorForm(guide);

  const { errors } = form.formState;

  return (
    <FormProvider {...form}>
      <Card className={s.root} padding='lg'>
        <form noValidate className={s.form} onSubmit={onSubmit}>
          <div className={s.row}>
            <FormField label={t('kind')}>
              <Controller
                render={({ field }) => (
                  <SegmentedControl aria-label={t('kind')} options={kindOptions} value={field.value} onChange={field.onChange} />
                )}
                control={form.control}
                name='kind'
              />
            </FormField>
            <FormField label={t('locale')}>
              <Controller
                render={({ field }) => (
                  <SegmentedControl aria-label={t('locale')} options={localeOptions} value={field.value} onChange={field.onChange} />
                )}
                control={form.control}
                name='locale'
              />
            </FormField>
          </div>
          {kind === 'tank' && (
            <FormField error={errors.tankId && t('errors.tank')} label={t('tank')}>
              <TankPicker className={s.subject} placeholder={t('tankPlaceholder')} value={tank} onChange={onTankChange} />
            </FormField>
          )}
          {kind === 'map' && (
            <FormField error={errors.arenaId && t('errors.map')} label={t('map')}>
              <Select aria-label={t('map')} className={s.subject} items={mapItems} value={map} onValueChange={onMapChange} />
            </FormField>
          )}
          <FormField
            error={errors.title && t('errors.title', { min: GUIDE_FORM.titleMin, max: titleMax ?? titleLength })}
            hint={t('counter', { length: titleLength, max: titleMax ?? titleLength })}
            htmlFor={titleId}
            label={t('title')}
          >
            <Input
              id={titleId}
              isInvalid={Boolean(errors.title)}
              maxLength={titleMax}
              placeholder={t('titlePlaceholder')}
              {...form.register('title')}
            />
          </FormField>
          <GuideBodyField />
          <FormFooter hint={t('moderationHint')}>
            <Link className={buttonVariants({ variant: 'ghost' })} href={cancelHref}>
              {t('cancel')}
            </Link>
            <Button disabled={isPending} type='submit'>
              {submitLabel}
            </Button>
          </FormFooter>
        </form>
      </Card>
    </FormProvider>
  );
};
