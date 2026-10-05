import { groupBy } from 'remeda';

import type { SupertestChangeRow } from '../selects/supertest-announcement.types';
import type { SupertestAnnouncementView, SupertestChangeView, SupertestTankView } from '../supertest.types';
import type { ToAnnouncementInput } from './supertest-view.types';

import { SUPERTEST_SOURCES } from '../config/scrape.constants';
import { SUPERTEST_VIEW } from '../config/view.constants';
import { changeBaseline, changeVerdict } from '../lib/change-verdict/change-verdict';
import { tankVerdict } from '../lib/supertest-summary/supertest-summary';

const tankKey = (row: Pick<SupertestChangeRow, 'tankId' | 'tankName'>): string =>
  row.tankId === null ? `name:${row.tankName.trim().toLowerCase()}` : `tank:${row.tankId}`;

const toSupertestChange = (row: SupertestChangeRow): SupertestChangeView => {
  const baseline = changeBaseline({ from: row.fromValue, live: row.liveValue });

  return {
    id: row.id,
    param: row.param,
    label: row.label,
    from: row.fromValue,
    to: row.toValue,
    live: row.liveValue,
    delta: baseline === null || row.toValue === null ? null : Number((row.toValue - baseline).toFixed(SUPERTEST_VIEW.deltaDigits)),
    unit: row.unit,
    raw: row.raw,
    verdict: changeVerdict({ param: row.param, from: row.fromValue, to: row.toValue, live: row.liveValue })
  };
};

export const toSupertestAnnouncement = ({ row, catalog }: ToAnnouncementInput): SupertestAnnouncementView => {
  const groups = groupBy(row.changes, tankKey);

  const tanks = Object.entries(groups).map(([key, rows]): SupertestTankView => {
    const [first] = rows;
    const tankId = first.tankId;
    const changes = rows.filter((change) => change.label.length > 0).map(toSupertestChange);

    return {
      key,
      tankId,
      name: first.tankName,
      vehicle: tankId === null ? null : (catalog.get(tankId)?.summary ?? null),
      isNewVehicle: rows.some((change) => change.isNewVehicle),
      verdict: tankVerdict(changes.map((change) => change.verdict)),
      changes
    };
  });

  return {
    id: row.id,
    url: row.url,
    title: row.title,
    summary: row.summary,
    image: row.image,
    source: row.source,
    isOfficial: row.source === SUPERTEST_SOURCES.official,
    publishedAt: row.publishedAt.toISOString(),
    parsedAt: row.parsedAt?.toISOString() ?? null,
    tanks
  };
};
