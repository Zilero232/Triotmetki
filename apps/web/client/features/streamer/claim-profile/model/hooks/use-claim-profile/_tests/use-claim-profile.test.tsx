import type { StreamerClaim, StreamerIntegration } from '@otmetki/schemas';
import type { ReactNode } from 'react';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { toast } from 'sonner';
import { afterAll, describe, expect, it, vi } from 'vitest';

import type { AuthSession } from '@/entities/auth/session';

import { NotFoundError } from '@/shared/api/source';
import { QUERY_KEYS } from '@/shared/constants';
import { messages } from '@/shared/i18n';

import { getClaimStatus, startClaim, verifyClaim } from '../../../../api';
import { useClaimProfile } from '../use-claim-profile';

vi.hoisted(() => vi.resetModules());

afterAll(() => {
  vi.resetModules();
});

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));

vi.mock('../../../../api', () => ({ getClaimStatus: vi.fn(), startClaim: vi.fn(), verifyClaim: vi.fn() }));

const TEXT = messages.en.streamersDirectory.claim;
const SLUG = 'jove';
const SESSION: AuthSession = {
  user: { id: 'user-1', name: 'Tanker', email: 'user-1@example.com', emailVerified: false, createdAt: new Date(0), updatedAt: new Date(0) },
  lestaAccountId: null
};

const OPEN_CODE_CLAIM: StreamerClaim = {
  id: '00000000-0000-4000-8000-000000000001',
  slug: SLUG,
  method: 'bio_code',
  status: 'open',
  code: 'OTM-1234',
  createdAt: '2026-01-01T00:00:00.000Z',
  resolvedAt: null
};

const RESOLVED_CLAIM: StreamerClaim = { ...OPEN_CODE_CLAIM, method: 'oauth', status: 'resolved', code: null, resolvedAt: '2026-01-02T00:00:00.000Z' };

const TWITCH: StreamerIntegration = {
  provider: 'twitch',
  externalId: '123456',
  login: 'jove_tv',
  connectedAt: '2026-01-01T00:00:00.000Z',
  predictions: false,
  canPredict: false
};

type Seed = {
  session?: AuthSession;
  integrations?: StreamerIntegration[];
};

const setup = ({ session, integrations = [] }: Seed) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });

  if (session === undefined) {
    client.setQueryDefaults(QUERY_KEYS.auth.session, { enabled: false });
  } else {
    client.setQueryData(QUERY_KEYS.auth.session, session);
  }

  client.setQueryDefaults(QUERY_KEYS.me.streamer.integrations, { staleTime: Infinity });
  client.setQueryData(QUERY_KEYS.me.streamer.integrations, integrations);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>
      <NextIntlClientProvider locale='en' messages={messages.en}>
        {children}
      </NextIntlClientProvider>
    </QueryClientProvider>
  );

  return { client, ...renderHook(() => useClaimProfile(SLUG), { wrapper }) };
};

const renderReady = async (claim: StreamerClaim | null, integrations: StreamerIntegration[] = []) => {
  vi.mocked(getClaimStatus).mockResolvedValue(claim);

  const view = setup({ session: SESSION, integrations });

  await waitFor(() => expect(view.result.current.view).toBe('ready'));

  return view;
};

describe('useClaimProfile', () => {
  it('waits while the session is unknown', () => {
    const { result } = setup({});

    expect(result.current.view).toBe('pending');
  });

  it('asks a guest to sign in without loading the claim', () => {
    const { result } = setup({ session: null });

    expect(result.current.view).toBe('signIn');
    expect(getClaimStatus).not.toHaveBeenCalled();
  });

  it('waits for the claim status of a signed-in user', () => {
    vi.mocked(getClaimStatus).mockReturnValue(new Promise(() => {}));
    const { result } = setup({ session: SESSION });

    expect(result.current.view).toBe('pending');
  });

  it('is ready with no claim when nothing was filed yet', async () => {
    const { result } = await renderReady(null);

    expect(result.current.claim).toBeNull();
    expect(result.current.stage).toBe('none');
  });

  it('treats a missing invitation as nothing to claim', async () => {
    vi.mocked(getClaimStatus).mockRejectedValue(new NotFoundError());
    const { result } = setup({ session: SESSION });

    await waitFor(() => expect(result.current.view).toBe('missing'));
  });

  it('reports any other status error as a failure', async () => {
    vi.mocked(getClaimStatus).mockRejectedValue(new Error('down'));
    const { result } = setup({ session: SESSION });

    await waitFor(() => expect(result.current.view).toBe('failed'));
  });

  it('shows the connected Twitch login', async () => {
    const { result } = await renderReady(null, [TWITCH]);

    expect(result.current.twitchLogin).toBe(TWITCH.login);
  });

  it('falls back to the Twitch channel id when the login is unknown', async () => {
    const { result } = await renderReady(null, [{ ...TWITCH, login: null }]);

    expect(result.current.twitchLogin).toBe(TWITCH.externalId);
  });

  it('has no Twitch login when only other providers are connected', async () => {
    const { result } = await renderReady(null, [{ ...TWITCH, provider: 'youtube' }]);

    expect(result.current.twitchLogin).toBeNull();
  });

  it('marks the method being started until the claim is created', async () => {
    let settle = (_claim: StreamerClaim) => {};

    vi.mocked(startClaim).mockReturnValue(
      new Promise<StreamerClaim>((resolve) => {
        settle = resolve;
      })
    );

    const { result } = await renderReady(null);

    act(() => result.current.onCode());

    await waitFor(() => expect(result.current.startingMethod).toBe('bio_code'));
    expect(startClaim).toHaveBeenCalledWith({ slug: SLUG, method: 'bio_code' });

    act(() => settle(OPEN_CODE_CLAIM));

    await waitFor(() => expect(result.current.stage).toBe('code'));
    expect(result.current.startingMethod).toBeNull();
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('celebrates an instant Twitch verification', async () => {
    vi.mocked(startClaim).mockResolvedValue(RESOLVED_CLAIM);
    const { result } = await renderReady(null, [TWITCH]);

    act(() => result.current.onOauth());

    await waitFor(() => expect(result.current.stage).toBe('resolved'));
    expect(toast.success).toHaveBeenCalledWith(TEXT.resolved.toast);
  });

  it('explains a Twitch mismatch when the OAuth claim fails', async () => {
    vi.mocked(startClaim).mockRejectedValue(new Error('mismatch'));
    const { result } = await renderReady(null);

    act(() => result.current.onOauth());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(TEXT.oauth.failed));
  });

  it('shows a generic failure when a code claim cannot be started', async () => {
    vi.mocked(startClaim).mockRejectedValue(new Error('down'));
    const { result } = await renderReady(null);

    act(() => result.current.onCode());

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(TEXT.failed));
  });

  it('hints that the code is not in the description yet when verification finds nothing', async () => {
    vi.mocked(verifyClaim).mockResolvedValue(OPEN_CODE_CLAIM);
    const { result } = await renderReady(OPEN_CODE_CLAIM);

    act(() => result.current.onVerify());

    await waitFor(() => expect(toast.info).toHaveBeenCalledWith(TEXT.code.notFound));
    expect(verifyClaim).toHaveBeenCalledWith(SLUG);
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('celebrates a verified code without the not-found hint', async () => {
    vi.mocked(verifyClaim).mockResolvedValue({ ...OPEN_CODE_CLAIM, status: 'resolved' });
    const { result } = await renderReady(OPEN_CODE_CLAIM);

    act(() => result.current.onVerify());

    await waitFor(() => expect(toast.success).toHaveBeenCalledWith(TEXT.resolved.toast));
    expect(toast.info).not.toHaveBeenCalled();
    expect(result.current.stage).toBe('resolved');
  });

  it('refreshes the studio profile once a claim is verified, so the studio no longer reports no profile', async () => {
    vi.mocked(verifyClaim).mockResolvedValue({ ...OPEN_CODE_CLAIM, status: 'resolved' });
    const { client, result } = await renderReady(OPEN_CODE_CLAIM);

    client.setQueryData(QUERY_KEYS.me.streamer.profile, null);
    act(() => result.current.onVerify());

    await waitFor(() => expect(client.getQueryState(QUERY_KEYS.me.streamer.profile)?.isInvalidated).toBe(true));
  });
});
