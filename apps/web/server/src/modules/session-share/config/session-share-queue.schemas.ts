import { z } from 'zod';

import { ShareChannel } from '../../../../generated';

export const sessionSharePayloadSchema = z.object({
  userId: z.string().min(1),
  sessionId: z.uuid(),
  channel: z.enum(ShareChannel)
});
