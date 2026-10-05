import type { BetterAuthPlugin } from 'better-auth';

import { APIError, createAuthEndpoint, getSessionFromCtx } from 'better-auth/api';
import { setSessionCookie } from 'better-auth/cookies';
import { z } from 'zod';

import type { SignInVkInput, VkMiniAppOptions } from './vk-mini-app.types';

import { AUTH_PROVIDER, VK_MINI_APP_AUTH } from '../auth.constants';
import { integrationUnavailable } from '../integration-unavailable/integration-unavailable';
import { placeholderEmail } from '../placeholder-email/placeholder-email';
import { verifyVkLaunchParams } from './launch-params/launch-params';

const signInVk = async ({ ctx, identity }: SignInVkInput) => {
  const current = await getSessionFromCtx(ctx).catch(() => null);
  const linked = await ctx.context.internalAdapter.findAccountByKey({ providerId: AUTH_PROVIDER.vk, accountId: String(identity.vkUserId) });

  if (current && linked && linked.userId !== current.user.id) {
    throw APIError.fromStatus('CONFLICT', { message: 'This VK account is linked to another user' });
  }

  const existingUserId = current?.user.id ?? linked?.userId;
  const existing = existingUserId ? await ctx.context.internalAdapter.findUserById(existingUserId) : null;

  const user =
    existing ??
    (await ctx.context.internalAdapter.createUser(
      {
        name: VK_MINI_APP_AUTH.fallbackName.replace('{id}', String(identity.vkUserId)),
        email: placeholderEmail({ provider: AUTH_PROVIDER.vk, id: identity.vkUserId }),
        emailVerified: false
      },
      { method: AUTH_PROVIDER.vk }
    ));

  if (!linked) {
    await ctx.context.internalAdapter.createAccount({ userId: user.id, providerId: AUTH_PROVIDER.vk, accountId: String(identity.vkUserId) });
  }

  const session = await ctx.context.internalAdapter.createSession(user.id);

  await setSessionCookie(ctx, { session, user });

  return ctx.json({ token: session.token, user: { id: user.id, name: user.name } });
};

export const vkMiniApp = ({ appId, appSecret }: VkMiniAppOptions) =>
  ({
    id: 'vk-mini-app',
    endpoints: {
      vkMiniApp: createAuthEndpoint(
        '/vk/mini-app',
        {
          method: 'POST',
          body: z.object({ launchParams: z.string().min(1).max(VK_MINI_APP_AUTH.launchParamsMaxLength) })
        },
        async (ctx) => {
          if (!appSecret) {
            throw integrationUnavailable('The VK Mini App is not configured on this server');
          }

          const identity = verifyVkLaunchParams({ launchParams: ctx.body.launchParams, appId, appSecret });

          if (!identity) {
            throw APIError.fromStatus('UNAUTHORIZED', { message: 'The VK Mini App launch params are not signed by our app or have expired' });
          }

          return signInVk({ ctx, identity });
        }
      )
    }
  }) satisfies BetterAuthPlugin;
