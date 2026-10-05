import { describe, expect, it } from 'vitest';
import { mock } from 'vitest-mock-extended';

import type { VehicleSource } from '../../../../../generated';
import type { VehicleSourceRow } from '../vehicle-sources.types';

import { toVehicleSourceView } from '../vehicle-sources.mappers';

const STARTS = new Date('2026-09-01T00:00:00Z');

const row = (fields: Partial<VehicleSourceRow> = {}): VehicleSourceRow =>
  Object.assign(mock<VehicleSource>({ id: 's1', kind: 'event', title: 'Marathon', note: null, startsAt: null, endsAt: null }), {
    url: null,
    event: null,
    missionCampaignId: null,
    missionOperationId: null,
    ...fields
  });

describe('toVehicleSourceView', () => {
  it('drops a link that is not a URL', () => {
    expect(toVehicleSourceView(row({ url: 'see the forum' })).url).toBeNull();
    expect(toVehicleSourceView(row({ url: 'https://tanki.su/news/1' })).url).toBe('https://tanki.su/news/1');
  });

  it('links a mission only when both the campaign and the operation are known', () => {
    expect(toVehicleSourceView(row({ missionCampaignId: 1, missionOperationId: null })).mission).toBeNull();
    expect(toVehicleSourceView(row({ missionCampaignId: 1, missionOperationId: 0 })).mission).toEqual({ campaignId: 1, operationId: 0 });
  });

  it('attaches the game event with an open end kept open', () => {
    const view = toVehicleSourceView(row({ event: { slug: 'marathon', title: 'Marathon', url: null, startsAt: STARTS, endsAt: null } }));

    expect(view.event).toEqual({ slug: 'marathon', title: 'Marathon', url: null, startsAt: STARTS.toISOString(), endsAt: null });
  });
});
