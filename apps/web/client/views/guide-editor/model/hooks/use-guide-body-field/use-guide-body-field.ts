'use client';

import { useFormContext, useWatch } from 'react-hook-form';

import type { GuideFormOutput, GuideFormValues } from '../../../lib/guide-form';

import { GUIDE_FORM } from '../../../config';

export const useGuideBodyField = () => {
  const { control, formState } = useFormContext<GuideFormValues, unknown, GuideFormOutput>();
  const body = useWatch({ control, name: 'body' });

  return {
    control,
    length: body.length,
    max: GUIDE_FORM.bodyMax,
    min: GUIDE_FORM.bodyMin,
    isInvalid: Boolean(formState.errors.body)
  };
};
