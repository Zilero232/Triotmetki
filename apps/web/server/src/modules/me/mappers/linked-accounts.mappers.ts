import type { Player, UserLestaAccount } from '../../../../generated';
import type { LinkedLestaAccount } from './linked-accounts.types';

import { toIso, toNumber } from '../../../common/lib';

export const toLinkedLestaAccount = (link: UserLestaAccount & { player: Pick<Player, 'nickname'> }): LinkedLestaAccount => ({
  accountId: toNumber(link.accountId),
  nickname: link.player.nickname,
  isPrimary: link.isPrimary,
  linkedAt: link.linkedAt.toISOString(),
  tokenExpiresAt: toIso(link.tokenExpiresAt),
  isStale: link.tokenStaleAt !== null
});
