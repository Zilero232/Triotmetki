'use client';

import { USAGE_METERS } from '@otmetki/schemas';
import { useFormatter } from 'next-intl';

import { useArmorModel } from '@/entities/armor/armor-model';
import { useAuthSession } from '@/entities/auth/session';
import { useUsageMeter } from '@/entities/plus/usage';
import { useVehicleCatalog } from '@/features/tank/pick-tank';
import { isPlusRequiredError } from '@/shared/api/source';
import { useIsCrawler, useRouteParam } from '@/shared/lib';

import { ARMOR_QUOTA } from '../../../config';
import { armorAudience } from '../../../lib/armor-audience';
import { findArmorVehicle } from '../../../lib/armor-vehicle';
import { useArmorCompare } from '../use-armor-compare';

export const useTankArmorPage = () => {
  const format = useFormatter();
  const slug = useRouteParam('slug');
  const isCrawler = useIsCrawler();
  const { data: session } = useAuthSession();
  const { data: vehicles } = useVehicleCatalog();
  const query = useArmorModel({ idOrSlug: slug, enabled: isCrawler === false });
  const compare = useArmorCompare({ slug, modelTankId: query.data?.response.vehicle.tankId, enabled: isCrawler === false && query.isSuccess });
  const quota = useUsageMeter({
    meter: ARMOR_QUOTA.meter,
    enabled: isCrawler === false && query.fetchStatus === 'idle' && compare.fetchStatus === 'idle'
  });

  const vehicle = findArmorVehicle({ vehicles, idOrSlug: slug });
  const isLimited = isPlusRequiredError(query.error);
  const audience = armorAudience({ reported: quota.audience, isSignedIn: Boolean(session) });

  return {
    slug,
    tankSlug: vehicle?.slug ?? slug,
    name: vehicle?.name ?? query.data?.response.vehicle.name,
    query,
    compare,
    isCrawler: isCrawler === true,
    isLimited,
    isLimitShown: isLimited && !quota.isPending,
    isLimitPending: isLimited && quota.isPending,
    quota: {
      isVisible: !isLimited && !quota.isPending && !quota.isUnlimited && quota.limit !== null,
      audience,
      remaining: quota.remaining ?? 0,
      limit: quota.limit ?? USAGE_METERS[ARMOR_QUOTA.meter][audience] ?? 0,
      freeLimit: USAGE_METERS[ARMOR_QUOTA.meter].free,
      resetsOn: quota.resetsAt ? format.dateTime(new Date(quota.resetsAt), ARMOR_QUOTA.resetFormat) : ''
    }
  };
};
