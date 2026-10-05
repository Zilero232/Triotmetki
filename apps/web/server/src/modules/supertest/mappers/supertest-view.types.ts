import type { CatalogEntry } from '../../reference';
import type { SupertestAnnouncementRow } from '../selects/supertest-announcement.types';

export type ToAnnouncementInput = {
  row: SupertestAnnouncementRow;
  catalog: ReadonlyMap<number, CatalogEntry>;
};
