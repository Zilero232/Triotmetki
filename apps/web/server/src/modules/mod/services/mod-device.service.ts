import type { Hmac } from 'node:crypto';

import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { Redis } from 'ioredis';

import type {
  AuthenticateBodyInput,
  AuthenticatedBody,
  AuthenticatedDevice,
  AuthenticateDigestInput,
  AuthenticateInput,
  IdentifyDeviceInput,
  ModDeviceView,
  RequestSignerInput,
  RevokeDeviceInput,
  SignedDeviceBody,
  SignedModRequest,
  VerifyDigestInput
} from '../mod.types';

import { AppNotFoundException, ModException } from '../../../common/exceptions';
import { isSignatureHeader, matchesSignatureHeader, sha256Hmac } from '../../../common/lib';
import { AppConfigService } from '../../../config';
import { PrismaService, REDIS } from '../../../core';
import { MOD_DEVICE, MOD_REQUEST } from '../config/device.constants';
import { deviceSecret, matchesSecretHash } from '../lib/device-secret/device-secret';
import { isFreshTimestamp, isNonce, requestPath, signedPrefix } from '../lib/request-signature/request-signature';
import { toModDeviceView } from '../mappers/device.mappers';

@Injectable()
export class ModDeviceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    @Inject(REDIS) private readonly redis: Redis
  ) {}

  async identify({ deviceId, signature }: IdentifyDeviceInput): Promise<AuthenticatedDevice> {
    const device = deviceId ? await this.prisma.modDevice.findUnique({ where: { id: deviceId } }) : null;

    if (!device || device.accountId === null) {
      throw new ModException({ status: HttpStatus.UNAUTHORIZED, error: 'unknown_device' });
    }

    if (device.revokedAt) {
      throw new ModException({ status: HttpStatus.FORBIDDEN, error: 'device_revoked' });
    }

    if (!isSignatureHeader(signature) || !matchesSecretHash({ secret: this.secretOf(device.id), hash: device.secretHash })) {
      throw new ModException({ status: HttpStatus.UNAUTHORIZED, error: 'bad_signature' });
    }

    return { ...device, accountId: device.accountId };
  }

  async authenticateBody<T extends SignedDeviceBody>({ request, schema }: AuthenticateBodyInput<T>): Promise<AuthenticatedBody<T>> {
    const device = await this.authenticate({ request, rawBody: request.rawBody });
    const parsed = schema.safeParse(request.body);

    if (!parsed.success) {
      throw new ModException({ status: HttpStatus.BAD_REQUEST, error: 'invalid_payload', message: parsed.error.issues[0]?.message });
    }

    if (parsed.data.device_id !== device.id || BigInt(parsed.data.account_id) !== device.accountId) {
      throw new ModException({ status: HttpStatus.FORBIDDEN, error: 'account_mismatch' });
    }

    return { device, body: parsed.data };
  }

  async authenticate({ request, rawBody, signedHeaders = [] }: AuthenticateInput): Promise<AuthenticatedDevice> {
    const device = await this.identifyRequest(request);
    const digest = rawBody ? this.signer({ request, signedHeaders }).update(rawBody).digest('hex') : undefined;

    return this.verifyDigest({ request, device, digest });
  }

  async authenticateDigest({ request, digest }: AuthenticateDigestInput): Promise<AuthenticatedDevice> {
    const device = await this.identifyRequest(request);

    return this.verifyDigest({ request, device, digest });
  }

  assertSignable(request: SignedModRequest): void {
    const timestamp = request.header(MOD_DEVICE.timestampHeader);

    if (timestamp === undefined || !isNonce(request.header(MOD_DEVICE.nonceHeader))) {
      throw new ModException({ status: HttpStatus.UNAUTHORIZED, error: 'bad_signature' });
    }

    if (!isFreshTimestamp({ timestamp, now: new Date() })) {
      throw new ModException({ status: HttpStatus.PRECONDITION_REQUIRED, error: 'stale_request' });
    }
  }

  signer({ request, signedHeaders = [] }: RequestSignerInput): Hmac {
    const deviceId = request.header(MOD_DEVICE.header);
    const timestamp = request.header(MOD_DEVICE.timestampHeader);
    const nonce = request.header(MOD_DEVICE.nonceHeader);

    if (deviceId === undefined || timestamp === undefined || !isNonce(nonce)) {
      throw new ModException({ status: HttpStatus.UNAUTHORIZED, error: 'bad_signature' });
    }

    const headers = signedHeaders.flatMap((name) => {
      const value = request.header(name);

      return value === undefined ? [] : [{ name, value }];
    });

    const prefix = signedPrefix({ method: request.method, path: requestPath(request.originalUrl), timestamp, nonce, headers });

    return sha256Hmac(this.secretOf(deviceId)).update(prefix);
  }

  async list(userId: string): Promise<ModDeviceView[]> {
    const devices = await this.prisma.modDevice.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

    return devices.map(toModDeviceView);
  }

  async revoke({ userId, deviceId }: RevokeDeviceInput): Promise<void> {
    const revoked = await this.prisma.modDevice.updateMany({ where: { id: deviceId, userId, revokedAt: null }, data: { revokedAt: new Date() } });

    if (revoked.count === 0) {
      throw new AppNotFoundException('MOD_DEVICE_INVALID', 'No such active device');
    }
  }

  private identifyRequest(request: SignedModRequest): Promise<AuthenticatedDevice> {
    return this.identify({ deviceId: request.header(MOD_DEVICE.header), signature: request.header(MOD_DEVICE.signatureHeader) });
  }

  private async verifyDigest({ request, device, digest }: VerifyDigestInput): Promise<AuthenticatedDevice> {
    const timestamp = request.header(MOD_DEVICE.timestampHeader);
    const nonce = request.header(MOD_DEVICE.nonceHeader);

    if (!matchesSignatureHeader({ header: request.header(MOD_DEVICE.signatureHeader), digest }) || !isNonce(nonce)) {
      throw new ModException({ status: HttpStatus.UNAUTHORIZED, error: 'bad_signature' });
    }

    if (!isFreshTimestamp({ timestamp, now: new Date() })) {
      throw new ModException({ status: HttpStatus.PRECONDITION_REQUIRED, error: 'stale_request' });
    }

    const fresh = await this.redis.set(`${MOD_REQUEST.noncePrefix}${device.id}:${nonce}`, '1', 'EX', MOD_REQUEST.nonceTtlSeconds, 'NX');

    if (fresh === null) {
      throw new ModException({ status: HttpStatus.CONFLICT, error: 'replayed_request' });
    }

    return device;
  }

  private secretOf(deviceId: string): string {
    return deviceSecret({ deviceId, serverSecret: this.config.get('MOD_INGEST_SECRET') });
  }
}
