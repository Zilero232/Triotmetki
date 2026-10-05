import type { ShareChannel } from '../../../../../generated';
import type { ShareRecipientRow } from '../../selects/session-share.selects';

export type LinkedChannelsSource = Pick<ShareRecipientRow, 'accounts' | 'telegramAccount'>;

export type UnlinkedChannelsInput = {
  requested: readonly ShareChannel[];
  linked: readonly ShareChannel[];
};
