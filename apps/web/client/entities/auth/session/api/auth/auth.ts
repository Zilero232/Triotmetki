import { sessionExtrasSchema } from '@otmetki/schemas';

import { authClient } from '@/shared/api/auth';
import { bearerToken } from '@/shared/api/http';
import { fromAuth } from '@/shared/api/source';

import type { AuthSession, DeleteAccountOutcome } from './auth.types';

export const getAuthSession = async (): Promise<AuthSession> => {
  const session = await fromAuth(authClient.getSession());

  return session ? { user: session.user, lestaAccountId: sessionExtrasSchema.parse(session).lestaAccountId } : null;
};

export const signOut = async (): Promise<void> => {
  try {
    await fromAuth(authClient.signOut());
  } finally {
    bearerToken.clear();
  }
};

export const deleteAccount = async (): Promise<DeleteAccountOutcome> => {
  const result = await authClient.deleteUser();

  if (result.error?.code === authClient.$ERROR_CODES.SESSION_EXPIRED.code) {
    return 'reauthenticate';
  }

  await fromAuth(Promise.resolve(result));
  bearerToken.clear();

  return 'deleted';
};
