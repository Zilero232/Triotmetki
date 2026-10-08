'use client';

import { OtmetkiLogoIcon } from '@otmetki/icons';
import { useTranslations } from 'next-intl';

import { Band, KeyFigure, PageHero, Reveal } from '@/ui-kit';
import { PromoShowcase } from '@/widgets/promo/promo-banners';

import { MOD_PAGE } from '../config';
import { useModFigures } from '../model/hooks';
import { ModActions, ModCta, ModFairPlay, ModFaq, ModInstall, ModManager, ModShowcase, ModSwitches, ModTrust } from './components';

import s from './ModPage.module.scss';

export const ModPage = () => {
  const t = useTranslations('mod.hero');
  const figures = useModFigures();

  return (
    <div className={s.root}>
      <PageHero
        figures={
          <>
            <KeyFigure label={t('figures.components', { count: figures.components })} value={figures.components} variant='compact' />
            <KeyFigure label={t('figures.presets')} value={figures.presets} variant='compact' />
            <KeyFigure label={t('figures.price')} value={figures.price} variant='compact' />
          </>
        }
        actions={<ModActions />}
        art={{ kind: 'emblem', glyph: <OtmetkiLogoIcon size={MOD_PAGE.heroGlyph} /> }}
        breadcrumbs={[{ label: t('crumb') }]}
        eyebrow={t('eyebrow')}
        lead={t('lead', { count: figures.components })}
        title={t('title')}
      />
      <div className={s.section}>
        <ModTrust />
      </div>
      <Reveal className={s.section}>
        <PromoShowcase />
      </Reveal>
      <div className={s.section}>
        <ModShowcase />
      </div>
      <Band tone='raised'>
        <Reveal>
          <ModFairPlay />
        </Reveal>
      </Band>
      <Reveal className={s.section}>
        <ModInstall />
      </Reveal>
      <Band tone='deep'>
        <Reveal>
          <ModManager />
        </Reveal>
      </Band>
      <Reveal className={s.section}>
        <ModSwitches />
      </Reveal>
      <Reveal className={s.section}>
        <ModFaq />
      </Reveal>
      <Reveal className={s.section}>
        <ModCta />
      </Reveal>
    </div>
  );
};
