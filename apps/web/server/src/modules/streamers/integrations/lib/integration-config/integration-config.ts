import type { StreamerIntegration } from '../../../../../../generated';
import type { StoredIntegrationConfig } from './integration-config.types';

import { TWITCH } from '../../config/integrations.constants';
import { storedIntegrationConfigSchema } from '../../dto/integrations.schemas';

export const readIntegrationConfig = (config: unknown): StoredIntegrationConfig => storedIntegrationConfigSchema.safeParse(config).data ?? {};

export const canPredict = (integration: Pick<StreamerIntegration, 'provider' | 'scope'>): boolean =>
  integration.provider === 'twitch' && (integration.scope ?? '').split(' ').includes(TWITCH.predictionsScope);
