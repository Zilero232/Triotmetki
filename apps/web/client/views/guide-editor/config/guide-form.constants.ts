import { zCreateGuide } from '@/entities/guide/guide';

import type { GuideFormValues } from '../lib/guide-form';

export const GUIDE_FORM_KINDS = ['general', 'tank', 'map'] as const;

export const GUIDE_FORM_LOCALES = ['ru', 'en'] as const;

export const GUIDE_FORM = {
  titleMin: zCreateGuide.shape.title.minLength ?? 0,
  titleMax: zCreateGuide.shape.title.maxLength ?? undefined,
  bodyMin: zCreateGuide.shape.body.minLength ?? 0,
  bodyMax: zCreateGuide.shape.body.maxLength ?? undefined,
  noMap: 'none',
  skeletonHeights: [56, 320]
} as const;

export const GUIDE_FORM_DEFAULT_VALUES: GuideFormValues = {
  kind: 'general',
  tankId: undefined,
  arenaId: undefined,
  locale: 'ru',
  title: '',
  body: ''
};
