import type { BetterAuthPlugin } from 'better-auth';

import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';

import type { SignInTelegramInput, TelegramLoginOptions } from './telegram-login.types';

import { AUTH_PROVIDER } from '../auth.constants';
import { integrationUnavailable } from '../integration-unavailable/integration-unavailable';
import { placeholderEmail } from '../placeholder-email/placeholder-email';
import { verifyWebAppInitData } from './webapp-auth/webapp-auth';
import { WEBAPP_AUTH } from './webapp-auth/webapp-auth.constants';
import { verifyWidgetPayload, widgetIdentity } from './widget-auth/widget-auth';

const signInTelegram = async ({ ctx, identity, store }: SignInTelegramInput) => {
  const current = await getSessionFromCtx(ctx).catch(() => null);
  const owner = await store.findUserId(identity.telegramId);

  if (current && owner && owner !== current.user.id) {
    throw APIError.fromStatus('CONFLICT', { message: 'This Telegram account is linked to another user' });
  }

  const existingUserId = current?.user.id ?? owner;
  const existing = existingUserId ? await ctx.context.internalAdapter.findUserById(existingUserId) : null;

  const user =
    existing ??
    (await ctx.context.internalAdapter.createUser(
      {
        name: identity.name,
        email: placeholderEmail({ provider: AUTH_PROVIDER.telegram, id: identity.telegramId }),
        emailVerified: false
      },
      { method: AUTH_PROVIDER.telegram }
    ));

  if (!owner) {
    await ctx.context.internalAdapter.createAccount({
      userId: user.id,
      providerId: AUTH_PROVIDER.telegram,
      accountId: String(identity.telegramId)
    });
  }

  await store.link({ ...identity, userId: user.id });

  const session = await ctx.context.internalAdapter.createSession(user.id);

  await setSessionCookie(ctx, { session, user });

  return ctx.json({ token: session.token, user: { id: user.id, name: user.name } });
};

export const telegramLogin = ({ botToken, botUsername, store }: TelegramLoginOptions) =>
  ({
    id: 'telegram-login',
    endpoints: {
      telegramWidget: createAuthEndpoint('/telegram/widget', { method: 'GET' }, async (ctx) =>
        ctx.json({ botUsername: botUsername || null, enabled: Boolean(botToken && botUsername) })
      ),

      telegramCallback: createAuthEndpoint(
        '/telegram/callback',
        {
          method: 'POST',
          body: z.record(z.string(), z.union([z.string(), z.number()]).transform(String))
        },
        async (ctx) => {
          if (!botToken) {
            throw integrationUnavailable('Telegram sign-in is not configured on this server');
          }

          const payload = ctx.body;
          const identity = widgetIdentity(payload);

          if (!verifyWidgetPayload({ payload, botToken }) || !identity) {
            throw APIError.fromStatus('UNAUTHORIZED', { message: 'The Telegram sign-in payload is not signed by our bot' });
          }

          return signInTelegram({ ctx, identity, store });
        }
      ),

      telegramWebApp: createAuthEndpoint(
        '/telegram/webapp',
        {
          method: 'POST',
          body: z.object({ initData: z.string().min(1).max(WEBAPP_AUTH.initDataMaxLength) })
        },
        async (ctx) => {
          if (!botToken) {
            throw integrationUnavailable('The Telegram Mini App is not configured on this server');
          }

          const identity = verifyWebAppInitData({ initData: ctx.body.initData, botToken });

          if (!identity) {
            throw APIError.fromStatus('UNAUTHORIZED', { message: 'The Mini App init data is not signed by our bot or has expired' });
          }

          return signInTelegram({ ctx, identity, store });
        }
      )
    }
  }) satisfies BetterAuthPlugin;
