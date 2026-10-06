import type { ReactNode } from 'react';

import clients from '@contract/clients.json';
import gameface from '@contract/gameface-status.json';
import outcome from '@contract/install-outcome.json';
import plan from '@contract/install-plan.json';
import profiles from '@contract/profiles.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { mockIPC } from '@tauri-apps/api/mocks';
import { act, renderHook, waitFor } from '@testing-library/react';
import { IntlProvider } from 'use-intl';
import { describe, expect, it, vi } from 'vitest';

import { COMMANDS } from '@/shared/config';
import { MESSAGES } from '@/shared/i18n';
import { NavigationContext } from '@/shared/lib';

import { useInstallWizardState } from '../use-install-wizard-state';

const RESPONSES: Record<string, unknown> = {
  [COMMANDS.listClients]: clients,
  [COMMANDS.prepareInstall]: plan,
  [COMMANDS.installModpack]: outcome,
  [COMMANDS.getGamefaceStatus]: gameface,
  [COMMANDS.activateProfile]: profiles
};

const setup = () => {
  const calls: { command: string; args: unknown }[] = [];
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const navigation = { page: 'install' as const, params: {}, visit: 0, navigate: vi.fn() };
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale='ru' messages={MESSAGES.ru}>
        <NavigationContext value={navigation}>{children}</NavigationContext>
      </IntlProvider>
    </QueryClientProvider>
  );

  mockIPC((command, args) => {
    calls.push({ command, args });

    return RESPONSES[command] ?? null;
  });

  return { calls, navigation, wrapper };
};

describe('useInstallWizardState', () => {
  it('ticks no other mod for removal until the player does', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useInstallWizardState({ initialPreset: null, initialComponents: null, startAtReview: false, profileId: null }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.plan?.otherMods.length).toBeGreaterThan(0));

    expect(result.current.removeOthers.size).toBe(0);
  });

  it('ticks another mod for removal when the player does', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useInstallWizardState({ initialPreset: null, initialComponents: null, startAtReview: false, profileId: null }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.plan?.otherMods.length).toBeGreaterThan(0));
    act(() => result.current.onToggleOther({ id: result.current.plan?.otherMods[0]?.path ?? '', checked: true }));

    expect(result.current.removeOthers.size).toBe(1);
  });

  it('never steps past the last step', async () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useInstallWizardState({ initialPreset: null, initialComponents: null, startAtReview: true, profileId: null }),
      { wrapper }
    );

    act(() => result.current.goNext());

    expect(result.current.isLastStep).toBe(true);
  });

  it('never steps back before the first step', () => {
    const { wrapper } = setup();
    const { result } = renderHook(
      () => useInstallWizardState({ initialPreset: null, initialComponents: null, startAtReview: false, profileId: null }),
      { wrapper }
    );

    act(() => result.current.goBack());

    expect(result.current.isFirstStep).toBe(true);
  });

  it('installs the selection with its libraries and removes nothing by default', async () => {
    const { calls, navigation, wrapper } = setup();
    const { result } = renderHook(
      () => useInstallWizardState({ initialPreset: null, initialComponents: null, startAtReview: true, profileId: null }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.canInstall).toBe(true));
    act(() => result.current.onInstall());
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith({ page: 'home' }));

    const install = calls.find((call) => call.command === COMMANDS.installModpack);

    expect(install?.args).toEqual({
      request: { clientPath: clients.selected, components: expect.any(Array), removeOthers: [] }
    });
  });

  const installProfile = async () => {
    const { calls, navigation, wrapper } = setup();
    const { result } = renderHook(
      () => useInstallWizardState({ initialPreset: null, initialComponents: ['core'], startAtReview: true, profileId: 'a1b2c3d4e5f6' }),
      { wrapper }
    );

    await waitFor(() => expect(result.current.canInstall).toBe(true));
    act(() => result.current.onInstall());
    await waitFor(() => expect(navigation.navigate).toHaveBeenCalledWith({ page: 'home' }));

    return calls;
  };

  it('writes the settings of the profile it installs once the install succeeded', async () => {
    const commands = (await installProfile()).map((call) => call.command);

    expect(commands.indexOf(COMMANDS.activateProfile)).toBeGreaterThan(commands.indexOf(COMMANDS.installModpack));
  });

  it('writes the settings of the profile it was asked to install', async () => {
    const activate = (await installProfile()).find((call) => call.command === COMMANDS.activateProfile);

    expect(activate?.args).toEqual({ clientPath: clients.selected, id: 'a1b2c3d4e5f6' });
  });
});
