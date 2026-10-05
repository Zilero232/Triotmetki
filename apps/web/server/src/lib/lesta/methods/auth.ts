import { z } from 'zod';

import type { LestaParams, LestaRequester } from '../client/client.types';
import type { ProlongateResult } from '../schemas/auth/auth.types';
import type { LoginCallbackResult, LoginUrlInput, LogoutInput, ProlongateInput } from './methods.types';

import { LESTA_API } from '../client/client.constants';
import { toSearchParams } from '../client/params/params';
import { loginCallbackSchema, loginLocationSchema, prolongateSchema } from '../schemas/auth/auth.schemas';

export const parseLoginCallback = (query: string | URLSearchParams): LoginCallbackResult => {
  const search = typeof query === 'string' ? new URLSearchParams(query) : query;
  const parsed = loginCallbackSchema.safeParse(Object.fromEntries(search));

  if (!parsed.success) {
    return { status: 'error', code: 'INVALID_CALLBACK', message: parsed.error.message };
  }

  if (parsed.data.status === 'error') {
    return parsed.data;
  }

  const { access_token, account_id, nickname, expires_at } = parsed.data;

  return { status: 'ok', accessToken: access_token, accountId: account_id, nickname, expiresAt: expires_at };
};

export const createAuthMethods = (requester: LestaRequester) => {
  const loginParams = ({ redirectUri, expiresAt, display, nofollow }: LoginUrlInput): LestaParams => ({
    application_id: requester.applicationId,
    redirect_uri: redirectUri,
    expires_at: expiresAt,
    display,
    nofollow: nofollow ? 1 : undefined
  });

  const loginUrl = (input: LoginUrlInput): string => `${requester.baseUrl}${LESTA_API.loginPath}?${toSearchParams(loginParams(input)).toString()}`;

  const login = async (input: Omit<LoginUrlInput, 'nofollow'>): Promise<string> => {
    const { data } = await requester.call({ method: 'auth/login', params: loginParams({ ...input, nofollow: true }), schema: loginLocationSchema });

    return data.location;
  };

  const prolongate = async ({ accessToken, expiresAt }: ProlongateInput): Promise<ProlongateResult> => {
    const { data } = await requester.call({
      method: 'auth/prolongate',
      params: { access_token: accessToken, expires_at: expiresAt },
      schema: prolongateSchema
    });

    return data;
  };

  const logout = async ({ accessToken }: LogoutInput): Promise<void> => {
    await requester.call({ method: 'auth/logout', params: { access_token: accessToken }, schema: z.unknown() });
  };

  return { loginUrl, login, prolongate, logout, parseLoginCallback };
};
