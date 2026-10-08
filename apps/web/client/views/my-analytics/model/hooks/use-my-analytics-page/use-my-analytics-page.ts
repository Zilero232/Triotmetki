'use client';

import type { VehicleSummary } from '@otmetki/schemas';

import { parseAsStringLiteral, useQueryState } from 'nuqs';

import { usePlus } from '@/features/plus/plus-gate';
import { ROUTES } from '@/shared/constants';
import { useRouter } from '@/shared/i18n/navigation';

import type { AnalyticsTab } from '../../../config';

import { ANALYTICS_TAB_PARAM, ANALYTICS_TABS } from '../../../config';

export const useMyAnalyticsPage = () => {
  const router = useRouter();
  const { isPlus, isPending, isError } = usePlus();
  const [tab, setTab] = useQueryState(
    ANALYTICS_TAB_PARAM,
    parseAsStringLiteral(ANALYTICS_TABS.map(({ value }) => value))
      .withDefault(ANALYTICS_TABS[0].value)
      .withOptions({ history: 'replace', scroll: false })
  );

  const isFreeViewer = !isPending && !isError && !isPlus;

  return {
    tab,
    tabs: ANALYTICS_TABS.map(({ value, feature }) => ({ value, isLocked: feature !== null && isFreeViewer })),
    isPeriodVisible: ANALYTICS_TABS.some((item) => item.value === tab && item.hasPeriod),
    setTab: (next: AnalyticsTab) => void setTab(next),
    openTank: (vehicle: VehicleSummary | null) => {
      if (vehicle) {
        router.push(ROUTES.account.analyticsTank(vehicle.tankId));
      }
    }
  };
};
