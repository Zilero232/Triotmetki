import { Injectable } from '@nestjs/common';

import type { StreamerIntegration, StreamerProvider } from '../../../../../generated';
import type { OAuthStateInput, SaveIntegrationInput, SetPredictionsInput, StoreTokenInput, StreamerIntegrationView } from '../integrations.types';

import { AppBadRequestException, AppConflictException, AppNotFoundException } from '../../../../common/exceptions';
import { toJsonValue } from '../../../../common/lib';
import { PrismaService, TokenCipherService } from '../../../../core';
import { storedIntegrationConfigSchema } from '../dto/integrations.schemas';
import { canPredict } from '../lib/integration-config';
import { toIntegrationView } from '../mappers/integration.mappers';

@Injectable()
export class IntegrationStoreService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: TokenCipherService
  ) {}

  async list(userId: string): Promise<StreamerIntegrationView[]> {
    const integrations = await this.prisma.streamerIntegration.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });

    return integrations.map(toIntegrationView);
  }

  async byProvider(provider: StreamerProvider): Promise<StreamerIntegration[]> {
    const integrations = await this.prisma.streamerIntegration.findMany({ where: { provider, accessToken: { not: null } } });

    return Promise.all(
      integrations.map(async (integration) => ({
        ...integration,
        accessToken: await this.openToken(integration.accessToken),
        refreshToken: await this.openToken(integration.refreshToken)
      }))
    );
  }

  async save({ userId, provider, externalId, accessToken, refreshToken, expiresAt, scope, config }: SaveIntegrationInput): Promise<void> {
    const owned = await this.prisma.streamerIntegration.count({ where: { provider, externalId, NOT: { userId } } });

    if (owned > 0) {
      throw new AppConflictException('CONFLICT', `This ${provider} account is connected to another user`);
    }

    const existing = await this.prisma.streamerIntegration.findUnique({ where: { userId_provider: { userId, provider } }, select: { config: true } });
    const merged = config ? toJsonValue({ ...storedIntegrationConfigSchema.parse(existing?.config ?? {}), ...config }) : undefined;
    const data = {
      externalId,
      accessToken: await this.cipher.seal(accessToken),
      refreshToken: await this.sealToken(refreshToken),
      tokenExpiresAt: expiresAt,
      scope,
      config: merged
    };

    await this.prisma.streamerIntegration.upsert({
      where: { userId_provider: { userId, provider } },
      create: { userId, provider, ...data },
      update: data
    });
  }

  async setPredictions({ userId, enabled }: SetPredictionsInput): Promise<StreamerIntegrationView[]> {
    const integration = await this.prisma.streamerIntegration.findUnique({ where: { userId_provider: { userId, provider: 'twitch' } } });

    if (!integration) {
      throw new AppNotFoundException('NOT_FOUND', 'Twitch is not connected');
    }

    if (enabled && !canPredict(integration)) {
      throw new AppBadRequestException('VALIDATION_FAILED', 'Reconnect Twitch to allow predictions');
    }

    await this.prisma.streamerIntegration.update({
      where: { id: integration.id },
      data: { config: toJsonValue({ ...storedIntegrationConfigSchema.parse(integration.config ?? {}), predictions: enabled }) }
    });

    return this.list(userId);
  }

  async storeToken({ provider, externalId, accessToken, refreshToken, expiresAt }: StoreTokenInput): Promise<void> {
    await this.prisma.streamerIntegration.updateMany({
      where: { provider, externalId },
      data: { accessToken: await this.cipher.seal(accessToken), refreshToken: await this.sealToken(refreshToken), tokenExpiresAt: expiresAt }
    });
  }

  async remove({ userId, provider }: OAuthStateInput): Promise<void> {
    await this.prisma.streamerIntegration.deleteMany({ where: { userId, provider } });
  }

  private async sealToken(token: string | null): Promise<string | null> {
    return token === null ? null : this.cipher.seal(token);
  }

  private async openToken(token: string | null): Promise<string | null> {
    return token === null ? null : this.cipher.open(token);
  }
}
