import { VK } from 'vk-io';

import { AppConfigService } from '../../../config';
import { VK_TOKENS } from '../config/tokens.constants';

export const vkBotProvider = {
  provide: VK_TOKENS.bot,
  inject: [AppConfigService],
  useFactory: (config: AppConfigService): VK | null => {
    const token = config.get('VK_BOT_TOKEN');
    const groupId = config.get('VK_GROUP_ID');

    return token && groupId > 0 ? new VK({ token, pollingGroupId: groupId }) : null;
  }
};
