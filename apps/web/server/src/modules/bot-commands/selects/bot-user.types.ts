import type { Prisma } from '../../../../generated';
import type { BOT_USER_SELECT } from './bot-user.selects';

export type BotUserRow = Prisma.UserGetPayload<{ select: typeof BOT_USER_SELECT }>;
