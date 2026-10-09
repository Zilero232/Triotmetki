'use client';

import { Box } from 'lucide-react';
import { useTranslations } from 'next-intl';

import { isNotFoundError } from '@/shared/api/source';
import { EmptyState, QueryState } from '@/ui-kit';
import { ArmorViewer } from '@/widgets/armor/armor-viewer';

import { useTankArmorPage } from '../model/hooks';
import { ArmorAttribution, ArmorCompareBar, ArmorHeader, ArmorIntro, ArmorLimit, ArmorLoading, ArmorQuota, CompareFallback } from './components';

import s from './TankArmorPage.module.scss';

export const TankArmorPage = () => {
  const t = useTranslations('armor.states');
  const { slug, tankSlug, name, query, compare, isCrawler, isLimited, isLimitShown, isLimitPending, quota } = useTankArmorPage();

  return (
    <div className={s.root}>
      <ArmorHeader client={query.data?.response.source.client} name={name} slug={tankSlug} version={query.data?.response.gameVersion}>
        <ArmorIntro />
      </ArmorHeader>
      <div className={s.stage}>
        {isLimitPending && <ArmorLoading />}
        {isLimitShown && <ArmorLimit {...quota} />}
        {!isCrawler && !isLimited && (
          <QueryState
            errorState={
              isNotFoundError(query.error) ? (
                <EmptyState description={t('emptyDescription')} icon={<Box size={36} strokeWidth={1.5} />} title={t('emptyTitle')} />
              ) : undefined
            }
            errorDescription={t('errorDescription')}
            errorTitle={t('errorTitle')}
            query={query}
            skeleton={<ArmorLoading />}
          >
            {(model) => (
              <>
                <ArmorCompareBar
                  excludeIds={compare.excludeIds}
                  isActive={compare.slug !== null}
                  quota={quota.isVisible && <ArmorQuota {...quota} />}
                  vehicle={compare.vehicle}
                  onClear={compare.onClear}
                  onPick={compare.onPick}
                />
                <ArmorViewer
                  compare={
                    compare.slug
                      ? {
                          name: compare.name,
                          model: compare.model,
                          fallback: <CompareFallback quota={quota} status={compare.status} onRetry={compare.retry} />
                        }
                      : undefined
                  }
                  model={model}
                  slug={slug}
                />
              </>
            )}
          </QueryState>
        )}
      </div>
      <ArmorAttribution commit={query.data?.response.source.commit} />
    </div>
  );
};
