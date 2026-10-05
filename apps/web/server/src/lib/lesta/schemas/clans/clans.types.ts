import type { z } from 'zod';

import type { clanAccountInfoSchema, clanInfoSchema, clanListItemSchema, clanMemberHistoryEntrySchema, clanMemberSchema } from './clans.schemas';

export type ClanMember = z.infer<typeof clanMemberSchema>;
export type ClanInfo = z.infer<typeof clanInfoSchema>;
export type ClanMemberHistoryEntry = z.infer<typeof clanMemberHistoryEntrySchema>;
export type ClanListItem = z.infer<typeof clanListItemSchema>;
export type ClanAccountInfo = z.infer<typeof clanAccountInfoSchema>;
