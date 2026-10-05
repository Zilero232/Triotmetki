import type { BetterAuthPlugin } from 'better-auth';

import { createAuthEndpoint, getSessionFromCtx, sessionMiddleware } from 'better-auth/api';
import { deleteSessionCookie, expireCookie, setSessionCookie } from 'better-auth/cookies';
import { addMilliseconds, addSeconds, getUnixTime, millisecondsToSeconds } from 'date-fns';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';

import type { LestaIdOptions, LestaIdState } from './lesta-id.types';

import { AUTH_PROVIDER } from '../auth.constants';
import { placeholderEmail } from '../placeholder-email/placeholder-email';
import { LESTA_ID, LESTA_ID_ERROR } from './lesta-id.constants';
import { safeCallbackUrl, verifyLestaLogin, withError } from './lesta-id.verify';

const stateSchema = z.object({
  callbackURL: z.string(),
  errorCallbackURL: z.string().nullable().default(null),
  linkUserId: z.string().nullable()
});

export const lestaId = ({ isConnected, lesta, store, apiUrl, webUrl }: LestaIdOptions) =>
  ({
    id: 'lesta-id',
    endpoints: {
      lestaStart: createAuthEndpoint(
        '/lesta/start',
        {
          method: 'GET',
          query: z.object({ callbackURL: z.string().optional(), errorCallbackURL: z.string().optional() }).optional()
        },
        async (ctx) => {
          if (!isConnected) {
            const requested = ctx.query?.errorCallbackURL ?? ctx.query?.callbackURL;

            throw ctx.redirect(withError({ url: safeCallbackUrl({ requested, webUrl }), code: LESTA_ID_ERROR.notConnected }));
          }

          const session = await getSessionFromCtx(ctx).catch(() => null);
          const state = randomBytes(LESTA_ID.stateBytes).toString('base64url');
          const value: LestaIdState = {
            callbackURL: safeCallbackUrl({ requested: ctx.query?.callbackURL, webUrl }),
            errorCallbackURL: ctx.query?.errorCallbackURL ? safeCallbackUrl({ requested: ctx.query.errorCallbackURL, webUrl }) : null,
            linkUserId: session?.user.id ?? null
          };

          await ctx.context.internalAdapter.createVerificationValue({
            identifier: `${LESTA_ID.statePrefix}${state}`,
            value: JSON.stringify(value),
            expiresAt: addMilliseconds(new Date(), LESTA_ID.stateTtlMs)
          });

          const stateCookie = ctx.context.createAuthCookie(LESTA_ID.stateCookie, { maxAge: millisecondsToSeconds(LESTA_ID.stateTtlMs) });

          await ctx.setSignedCookie(stateCookie.name, state, ctx.context.secret, stateCookie.attributes);

          const redirectUri = new URL(LESTA_ID.callbackPath, apiUrl);

          redirectUri.searchParams.set('state', state);

          const loginUrl = lesta.auth.loginUrl({
            redirectUri: redirectUri.toString(),
            expiresAt: getUnixTime(addSeconds(new Date(), LESTA_ID.tokenTtlSeconds))
          });

          throw ctx.redirect(loginUrl);
        }
      ),

      lestaCallback: createAuthEndpoint(
        '/lesta/callback',
        {
          method: 'GET',
          query: z.record(z.string(), z.string()).optional()
        },
        async (ctx) => {
          const query = new URLSearchParams(ctx.query ?? {});
          const stateKey = query.get('state');
          const stateCookie = ctx.context.createAuthCookie(LESTA_ID.stateCookie);
          const cookieState = await ctx.getSignedCookie(stateCookie.name, ctx.context.secret);

          expireCookie(ctx, stateCookie);

          const boundState = stateKey && cookieState === stateKey ? stateKey : null;
          const stored = boundState ? await ctx.context.internalAdapter.consumeVerificationValue(`${LESTA_ID.statePrefix}${boundState}`) : null;
          const parsedState = stored ? stateSchema.safeParse(JSON.parse(stored.value)) : null;

          if (!parsedState?.success) {
            throw ctx.redirect(withError({ url: webUrl, code: LESTA_ID_ERROR.state }));
          }

          const { callbackURL, errorCallbackURL, linkUserId } = parsedState.data;
          const errorURL = errorCallbackURL ?? callbackURL;

          if (linkUserId) {
            const current = await getSessionFromCtx(ctx).catch(() => null);

            if (current?.user.id !== linkUserId) {
              throw ctx.redirect(withError({ url: errorURL, code: LESTA_ID_ERROR.state }));
            }
          }

          const login = lesta.auth.parseLoginCallback(query);

          if (login.status === 'error') {
            throw ctx.redirect(withError({ url: errorURL, code: LESTA_ID_ERROR.denied }));
          }

          const identity = await verifyLestaLogin({ login, lesta }).catch(() => undefined);

          if (identity === undefined) {
            throw ctx.redirect(withError({ url: errorURL, code: LESTA_ID_ERROR.unavailable }));
          }

          if (identity === null) {
            throw ctx.redirect(withError({ url: errorURL, code: LESTA_ID_ERROR.token }));
          }

          const owner = await store.findUserId(identity.accountId);

          if (linkUserId && owner && owner !== linkUserId) {
            throw ctx.redirect(withError({ url: errorURL, code: LESTA_ID_ERROR.taken }));
          }

          const existingUserId = linkUserId ?? owner;
          const existing = existingUserId ? await ctx.context.internalAdapter.findUserById(existingUserId) : null;

          const user =
            existing ??
            (await ctx.context.internalAdapter.createUser(
              {
                name: identity.nickname,
                email: placeholderEmail({ provider: AUTH_PROVIDER.lesta, id: identity.accountId }),
                emailVerified: false
              },
              { method: AUTH_PROVIDER.lesta }
            ));

          if (!(await store.link({ ...identity, userId: user.id }))) {
            throw ctx.redirect(withError({ url: errorURL, code: LESTA_ID_ERROR.limit }));
          }

          const accounts = await ctx.context.internalAdapter.findAccounts(user.id);
          const hasAccount = accounts.some(
            (account) => account.providerId === AUTH_PROVIDER.lesta && account.accountId === String(identity.accountId)
          );

          if (!hasAccount) {
            await ctx.context.internalAdapter.createAccount({
              userId: user.id,
              providerId: AUTH_PROVIDER.lesta,
              accountId: String(identity.accountId)
            });
          }

          const session = await ctx.context.internalAdapter.createSession(user.id);

          await setSessionCookie(ctx, { session, user });

          throw ctx.redirect(callbackURL);
        }
      ),

      lestaLogout: createAuthEndpoint('/lesta/logout', { method: 'POST', use: [sessionMiddleware] }, async (ctx) => {
        const { session } = ctx.context.session;

        await store.revokeTokens(session.userId);
        await ctx.context.internalAdapter.deleteSession(session.token);
        deleteSessionCookie(ctx);

        return ctx.json({ success: true });
      })
    }
  }) satisfies BetterAuthPlugin;
