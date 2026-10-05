import { InjectQueue } from '@nestjs/bullmq';
import { HttpStatus, Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';

import type {
  AcceptedReplay,
  DiscardReplayInput,
  StoreReplayInput,
  UploadedReplay,
  UploadedReplayFile,
  UploadFromModInput,
  UploadReplayInput
} from '../replays.types';

import { AppBadRequestException, AppConflictException, ModException } from '../../../common/exceptions';
import { errorMessage } from '../../../common/lib';
import { isUniqueViolation, LIMIT_LOCK_SCOPE, lockedTransaction, ObjectStorage, PrismaService } from '../../../core';
import { parseReplaySummary } from '../../../lib/replay';
import { EntitlementsService } from '../../billing';
import { ModDeviceService } from '../../mod';
import { REPLAYS_QUEUE } from '../config/queue.constants';
import { REPLAY_UPLOAD } from '../config/upload.constants';
import { isRecordedBy, modVisibility } from '../lib/mod-upload/mod-upload';
import { replayExtension, replayStorageKey, sha256Hex } from '../lib/replay-file/replay-file';

@Injectable()
export class ReplayUploadWriterService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: ObjectStorage,
    private readonly devices: ModDeviceService,
    private readonly entitlements: EntitlementsService,
    @InjectQueue(REPLAYS_QUEUE.name) private readonly queue: Queue
  ) {}

  upload({ file, ...owner }: UploadReplayInput): Promise<UploadedReplay> {
    return this.store({ replay: this.accept(file), ...owner });
  }

  async uploadFromMod({ file, request }: UploadFromModInput): Promise<UploadedReplay> {
    const device = await this.devices.authenticate({ request, rawBody: file?.buffer, signedHeaders: [REPLAY_UPLOAD.visibilityHeader] });
    const visibility = modVisibility(request.header(REPLAY_UPLOAD.visibilityHeader));

    if (!visibility) {
      throw new AppBadRequestException('VALIDATION_FAILED', `Visibility must be one of ${REPLAY_UPLOAD.modVisibilities.join(', ')}`);
    }

    const replay = this.accept(file);

    if (!isRecordedBy({ summary: replay.summary, accountId: device.accountId })) {
      throw new ModException({
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        error: 'replay_not_owned',
        message: 'The replay was recorded by another account'
      });
    }

    return this.store({ replay, uploaderUserId: device.userId, deviceId: device.id, visibility });
  }

  private accept(file: UploadedReplayFile | undefined): AcceptedReplay {
    if (!file || file.size === 0) {
      throw new AppBadRequestException('REPLAY_INVALID', `Attach the replay as the "${REPLAY_UPLOAD.field}" field`);
    }

    const extension = replayExtension(file.originalname);

    if (!extension) {
      throw new AppBadRequestException('REPLAY_INVALID', `Only ${REPLAY_UPLOAD.extensions.join(', ')} files are accepted`);
    }

    if (file.size > REPLAY_UPLOAD.maxBytes) {
      throw new AppBadRequestException('REPLAY_INVALID', 'The replay is too large');
    }

    const bytes = new Uint8Array(file.buffer);

    try {
      return { file, bytes, extension, summary: parseReplaySummary(bytes) };
    } catch (error) {
      throw new AppBadRequestException('REPLAY_INVALID', `Not a readable replay: ${errorMessage(error)}`);
    }
  }

  private async store({ replay: { file, bytes, extension }, uploaderUserId, deviceId, visibility }: StoreReplayInput): Promise<UploadedReplay> {
    const sha256 = sha256Hex(bytes);
    const existing = await this.prisma.replay.findUnique({ where: { sha256 }, select: { id: true } });

    if (existing) {
      throw new AppConflictException('REPLAY_DUPLICATE', 'This replay is already uploaded');
    }

    const storageKey = replayStorageKey({ sha256, extension });
    const data = {
      storageKey,
      sha256,
      fileName: file.originalname.slice(0, REPLAY_UPLOAD.maxFileNameLength),
      fileSize: file.size,
      uploaderUserId,
      deviceId,
      visibility
    };

    const replay = await lockedTransaction({
      prisma: this.prisma,
      scope: LIMIT_LOCK_SCOPE.replays,
      key: uploaderUserId ?? sha256,
      run: async (tx) => {
        if (uploaderUserId) {
          const stored = await tx.replay.count({ where: { uploaderUserId } });

          await this.entitlements.assertWithinLimit({ userId: uploaderUserId, key: 'storedReplays', count: stored });
        }

        return tx.replay.create({ data, select: { id: true, status: true } });
      }
    }).catch((error: unknown) => {
      if (isUniqueViolation(error)) {
        throw new AppConflictException('REPLAY_DUPLICATE', 'This replay is already uploaded');
      }

      throw error;
    });

    try {
      await this.storage.put({ key: storageKey, body: bytes, contentType: REPLAY_UPLOAD.contentType });
    } catch (error) {
      await this.prisma.replay.delete({ where: { id: replay.id } }).catch(() => undefined);

      throw error;
    }

    try {
      await this.queue.add(
        REPLAYS_QUEUE.jobs.parse,
        { replayId: replay.id },
        {
          jobId: `${REPLAYS_QUEUE.parseJobPrefix}${replay.id}`,
          attempts: REPLAYS_QUEUE.parseAttempts,
          backoff: { type: 'exponential', delay: REPLAYS_QUEUE.parseBackoffMs }
        }
      );
    } catch (error) {
      await this.discard({ id: replay.id, storageKey });

      throw error;
    }

    return replay;
  }

  private async discard({ id, storageKey }: DiscardReplayInput): Promise<void> {
    await Promise.allSettled([this.prisma.replay.delete({ where: { id } }), this.storage.remove(storageKey)]);
  }
}
