import { HttpStatus, Injectable } from '@nestjs/common';

import type {
  AssertLinkedInput,
  ModSessionSharePreferenceAnswer,
  ModSessionShareSent,
  SavePreferenceInput,
  SendShareInput
} from '../session-share.types';

import { ModException } from '../../../common/exceptions';
import { toNumber } from '../../../common/lib';
import { PrismaService } from '../../../core';
import { sessionUuid } from '../../mod';
import { linkedShareChannels, unlinkedChannels } from '../lib/share-channels/share-channels';
import { SHARE_RECIPIENT_SELECT } from '../selects/session-share.selects';
import { SessionShareQueueService } from './session-share-queue.service';

@Injectable()
export class SessionShareWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly queue: SessionShareQueueService
  ) {}

  async savePreference({ userId, accountId, enabled, channels }: SavePreferenceInput): Promise<ModSessionSharePreferenceAnswer> {
    if (enabled) {
      await this.assertLinked({ userId, channels });
    }

    const row = await this.prisma.sessionSharePreference.upsert({
      where: { userId },
      create: { userId, enabled, channels },
      update: { enabled, channels }
    });

    return { account_id: toNumber(accountId), enabled: row.enabled, channels: row.channels };
  }

  async send({ userId, accountId, modSessionId, channels }: SendShareInput): Promise<ModSessionShareSent> {
    await this.assertLinked({ userId, channels });

    const session = await this.prisma.playSession.findFirst({
      where: { id: sessionUuid({ accountId, sessionId: modSessionId }), accountId, source: 'mod', kind: 'live', battles: { gt: 0 } },
      select: { id: true }
    });

    if (!session) {
      throw new ModException({ status: HttpStatus.NOT_FOUND, error: 'session_not_found', message: 'No mod session with battles under this id' });
    }

    await this.queue.enqueue({ userId, sessionId: session.id, channels });

    return { account_id: toNumber(accountId), queued: channels };
  }

  private async assertLinked({ userId, channels }: AssertLinkedInput): Promise<void> {
    const recipient = await this.prisma.user.findUnique({ where: { id: userId }, select: SHARE_RECIPIENT_SELECT });
    const missing = unlinkedChannels({ requested: channels, linked: linkedShareChannels(recipient) });

    if (missing.length > 0) {
      throw new ModException({ status: HttpStatus.CONFLICT, error: 'channel_not_linked', message: `Link ${missing.join(', ')} on the site first` });
    }
  }
}
