import type { ModDevice } from '@otmetki/schemas';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/i18n';

import { DeviceList } from '../DeviceList';

const COPY = messages.en.me.mod;

const device = (id: string): ModDevice => ({
  id,
  accountId: null,
  name: `PC ${id}`,
  modVersion: '1.0.0',
  gameVersion: null,
  lastSeenAt: null,
  revokedAt: null,
  createdAt: '2026-01-01T00:00:00.000Z'
});

type RenderListInput = {
  devices?: ModDevice[];
  revokingId?: string | null;
  onRevoke?: (id: string) => void;
};

const renderList = ({ devices = [device('a')], revokingId = null, onRevoke = vi.fn() }: RenderListInput = {}) =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      <DeviceList devices={devices} revokingId={revokingId} onRevoke={onRevoke} />
    </NextIntlClientProvider>
  );

describe('DeviceList', () => {
  it('asks before unlinking a device', () => {
    const onRevoke = vi.fn();

    renderList({ onRevoke });

    fireEvent.click(screen.getByRole('button', { name: COPY.revoke }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onRevoke).not.toHaveBeenCalled();
  });

  it('unlinks the device once confirmed', () => {
    const onRevoke = vi.fn();

    renderList({ onRevoke });
    fireEvent.click(screen.getByRole('button', { name: COPY.revoke }));

    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: COPY.revoke }));

    expect(onRevoke).toHaveBeenCalledWith('a');
  });

  it('marks only the device being unlinked as pending', () => {
    renderList({ devices: [device('a'), device('b')], revokingId: 'a' });

    const [first, second] = screen.getAllByRole('button', { name: COPY.revoke });

    expect(first).toBeDisabled();
    expect(second).toBeEnabled();
  });
});
