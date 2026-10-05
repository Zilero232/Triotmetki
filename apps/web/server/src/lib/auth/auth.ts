import { apiKey } from '@better-auth/api-key';
import { API_KEY } from '@otmetki/schemas';
import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { admin, bearer, customSession, magicLink } from 'better-auth/plugins';

import type { CreateAuthInput } from './auth.types';

import { allowedOrigins, isProduction, trustedProxies } from '../../config';
import { API_KEY_PLUGIN, AUTH_RATE_LIMIT, SESSION } from './auth.constants';
import { lestaId } from './lesta-id/lesta-id.plugin';
import { authRateLimitRules, redisRateLimit } from './rate-limit/rate-limit';
import { socialProviders } from './social-providers/social-providers';
import { telegramLogin } from './telegram-login/telegram-login.plugin';
import { vkMiniApp } from './vk-mini-app/vk-mini-app.plugin';

export const createAuth = ({ env, prisma, redis, lesta, lestaStore, telegramStore, accountPurge, logger }: CreateAuthInput) => {
  const magicLinkEnabled = !isProduction(env);

  return betterAuth({
    appName: 'Three Marks',
    basePath: '/auth',
    disabledPaths: [...API_KEY_PLUGIN.disabledPaths],
    baseURL: env.API_URL,
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: allowedOrigins(env),
    database: prismaAdapter(prisma, { provider: 'postgresql' }),
    databaseHooks: {
      user: { delete: { before: async (user) => accountPurge.purgeAccount({ userId: user.id }) } }
    },
    advanced: {
      database: { generateId: 'uuid' },
      ipAddress: { trustedProxies: trustedProxies(env) }
    },
    rateLimit: {
      enabled: true,
      window: AUTH_RATE_LIMIT.window,
      max: AUTH_RATE_LIMIT.max,
      customRules: authRateLimitRules(),
      customStorage: redisRateLimit({ redis })
    },
    session: {
      expiresIn: SESSION.expiresIn,
      updateAge: SESSION.updateAge,
      freshAge: SESSION.freshAge
    },
    user: {
      deleteUser: { enabled: true }
    },
    emailAndPassword: { enabled: false },
    socialProviders: socialProviders(env),
    account: {
      encryptOAuthTokens: true,
      accountLinking: { enabled: true, allowDifferentEmails: true, disableImplicitLinking: true }
    },
    plugins: [
      bearer(),
      admin(),
      apiKey({
        apiKeyHeaders: API_KEY.header.toLowerCase(),
        defaultPrefix: API_KEY_PLUGIN.prefix,
        defaultKeyLength: API_KEY_PLUGIN.keyLength,
        startingCharactersConfig: { shouldStore: true, charactersLength: API_KEY_PLUGIN.prefix.length + API_KEY.prefixLength },
        maximumNameLength: API_KEY.maxNameLength,
        enableMetadata: true,
        keyExpiration: { minExpiresIn: API_KEY_PLUGIN.minExpiresInDays, maxExpiresIn: API_KEY_PLUGIN.maxExpiresInDays },
        rateLimit: { enabled: false },
        schema: { apikey: { modelName: API_KEY_PLUGIN.modelName } }
      }),
      lestaId({ isConnected: env.LESTA_APPLICATION_ID !== '', lesta, store: lestaStore, apiUrl: env.API_URL, webUrl: env.WEB_URL }),
      customSession(async ({ user, session }) => ({ user, session, lestaAccountId: await lestaStore.primaryAccountId(user.id) })),
      telegramLogin({ botToken: env.TELEGRAM_BOT_TOKEN, botUsername: env.TELEGRAM_BOT_USERNAME, store: telegramStore }),
      vkMiniApp({ appId: env.VK_MINI_APP_ID, appSecret: env.VK_MINI_APP_SECRET }),
      ...(magicLinkEnabled
        ? [
            magicLink({
              disableSignUp: false,
              sendMagicLink: async ({ email, url }) => {
                logger.log(`magic link for ${email}: ${url}`);
              }
            })
          ]
        : [])
    ]
  });
};
