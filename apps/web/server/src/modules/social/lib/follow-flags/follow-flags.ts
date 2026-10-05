import type { Follow } from '../../../../../generated';
import type { ClearFollowFlagInput, SetFollowFlagInput } from './follow-flags.types';

import { FOLLOW_FLAGS } from '../../config/follow-flags.constants';

export const setFollowFlag = ({ prisma, flag, key, data = {} }: SetFollowFlagInput): Promise<Follow> =>
  prisma.follow.upsert({
    where: { userId_kind_targetId: key },
    create: { ...key, ...FOLLOW_FLAGS[flag].only, ...data },
    update: { ...FOLLOW_FLAGS[flag].on, ...data }
  });

export const clearFollowFlag = ({ prisma, flag, where }: ClearFollowFlagInput): Promise<boolean> =>
  prisma.$transaction(async (tx) => {
    const deleted = await tx.follow.deleteMany({ where: { ...where, ...FOLLOW_FLAGS[flag].only } });

    if (deleted.count > 0) {
      return true;
    }

    const cleared = await tx.follow.updateMany({ where: { ...where, ...FOLLOW_FLAGS[flag].on }, data: FOLLOW_FLAGS[flag].reset });

    return cleared.count > 0;
  });
