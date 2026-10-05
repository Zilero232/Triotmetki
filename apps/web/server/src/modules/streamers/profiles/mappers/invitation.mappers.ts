import type { StreamerInvitation as InvitationView } from '@otmetki/schemas';

import type { StreamerInvitation } from '../../../../../generated';

import { toIso } from '../../../../common/lib';
import { invitationChannelsSchema } from '../dto/profiles.schemas';

export const toInvitationView = (row: StreamerInvitation): InvitationView => ({
  slug: row.slug,
  displayName: row.displayName,
  status: row.status,
  channels: invitationChannelsSchema.parse(row.channels),
  sourceUrl: row.sourceUrl,
  sentAt: toIso(row.sentAt)
});
