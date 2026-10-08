'use client';

import { ArrowDown, MonitorPlay } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { buttonVariants, PageHero } from '@/ui-kit';
import { StreamersHubNav } from '@/widgets/streamer/streamers-hub';

import { LANDING_ANCHORS } from '../config';
import { ConnectBand, FlowSection, StreamersCta, StudioLink, ToolsSection } from './components';

import s from './ForStreamersPage.module.scss';

export const ForStreamersPage = () => {
  const t = useTranslations('streamers.hero');

  return (
    <div className={s.root}>
      <PageHero
        actions={
          <>
            <StudioLink />
            <a className={buttonVariants({ variant: 'ghost', size: 'lg' })} href={`#${LANDING_ANCHORS.flow}`}>
              {t('ctaHow')}
              <ArrowDown aria-hidden size={16} />
            </a>
          </>
        }
        art={{ kind: 'emblem', glyph: <MonitorPlay size={480} strokeWidth={1.25} /> }}
        breadcrumbs={[{ label: t('crumb') }]}
        eyebrow={t('eyebrow')}
        lead={t('lead')}
        title={t('pageTitle')}
      />
      <div className={s.nav}>
        <StreamersHubNav />
      </div>
      <ToolsSection />
      <ConnectBand />
      <FlowSection />
      <StreamersCta />
    </div>
  );
};
