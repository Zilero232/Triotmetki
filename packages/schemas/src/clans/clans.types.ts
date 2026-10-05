import type { z } from 'zod';

import type {
  clanEventsPageSchema,
  clanListItemSchema,
  clanListPageSchema,
  clanListQuerySchema,
  clanListSortFieldSchema,
  clanMemberEventSchema,
  clanMemberSchema,
  clanPageSchema,
  clanRoleSchema,
  clanStrongholdSchema,
  clanSummarySchema,
  strongholdBattlesSchema,
  strongholdBuildingSchema,
  strongholdReserveSchema
} from './clans.schemas';

export type ClanRole = z.infer<typeof clanRoleSchema>;
export type ClanSummary = z.infer<typeof clanSummarySchema>;
export type ClanMember = z.infer<typeof clanMemberSchema>;
export type ClanMemberEvent = z.infer<typeof clanMemberEventSchema>;
export type ClanEventsPage = z.infer<typeof clanEventsPageSchema>;
export type ClanPage = z.infer<typeof clanPageSchema>;
export type ClanListSortField = z.infer<typeof clanListSortFieldSchema>;
export type ClanListQuery = z.infer<typeof clanListQuerySchema>;
export type ClanListItem = z.infer<typeof clanListItemSchema>;
export type ClanListPage = z.infer<typeof clanListPageSchema>;
export type StrongholdBuilding = z.infer<typeof strongholdBuildingSchema>;
export type StrongholdReserve = z.infer<typeof strongholdReserveSchema>;
export type StrongholdBattles = z.infer<typeof strongholdBattlesSchema>;
export type ClanStronghold = z.infer<typeof clanStrongholdSchema>;
