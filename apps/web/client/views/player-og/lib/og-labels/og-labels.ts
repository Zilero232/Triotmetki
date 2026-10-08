import { createTranslator } from 'next-intl';

import type { Locale } from '@/shared/i18n';

import { messages } from '@/shared/i18n';

import type { OgLabels } from './og-labels.types';

export const ogLabels = (locale: Locale): OgLabels => {
  const t = createTranslator({ locale, messages: messages[locale], namespace: 'profile.og' });
  const tRoot = createTranslator({ locale, messages: messages[locale] });
  const tWrapped = createTranslator({ locale, messages: messages[locale], namespace: 'wrapped.og' });

  return {
    brand: tRoot('brand.name'),
    fallback: tRoot('players.og.fallback'),
    player: {
      kind: t('eyebrow'),
      broneIndex: t('broneIndex'),
      winRate: t('winRate'),
      battles: t('battles'),
      noClan: t('noClan'),
      source: tRoot('footer.shortAttribution')
    },
    session: {
      kind: t('session'),
      battles: t('battles'),
      winRate: t('winRate'),
      avgDamage: t('avgDamage'),
      best: t('best'),
      source: tRoot('footer.shortAttribution')
    },
    wrapped: {
      kind: tWrapped('eyebrow'),
      year: tWrapped('year'),
      battles: t('battles'),
      winRate: t('winRate'),
      avgDamage: t('avgDamage'),
      marks: tWrapped('marks'),
      source: tRoot('footer.shortAttribution')
    }
  };
};
