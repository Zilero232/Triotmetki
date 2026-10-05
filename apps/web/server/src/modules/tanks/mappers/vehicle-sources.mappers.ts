import type { VehicleSource } from '@otmetki/schemas';

import type { VehicleSourceRow } from './vehicle-sources.types';

import { toIso } from '../../../common/lib';

export const toVehicleSourceView = (row: VehicleSourceRow): VehicleSource => ({
  id: row.id,
  kind: row.kind,
  title: row.title,
  url: row.url && URL.canParse(row.url) ? row.url : null,
  note: row.note,
  startsAt: toIso(row.startsAt),
  endsAt: toIso(row.endsAt),
  event: row.event
    ? {
        slug: row.event.slug,
        title: row.event.title,
        url: row.event.url,
        startsAt: row.event.startsAt.toISOString(),
        endsAt: toIso(row.event.endsAt)
      }
    : null,
  mission:
    row.missionCampaignId !== null && row.missionOperationId !== null
      ? { campaignId: row.missionCampaignId, operationId: row.missionOperationId }
      : null
});
