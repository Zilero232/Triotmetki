import type { Env } from '../../../config/env/env.types';

export type SocialProvidersInput = Pick<Env, 'DISCORD_APPLICATION_ID' | 'DISCORD_CLIENT_SECRET' | 'VK_ID_CLIENT_ID' | 'VK_ID_CLIENT_SECRET'>;
