import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { MOD_DISTRIBUTION } from '@/shared/config';
import { ROUTE_ANCHORS } from '@/shared/constants';
import { messages } from '@/shared/i18n';

import { useModDownloads } from '../../../../model/hooks';
import { ModActions } from '../ModActions';

vi.mock('../../../../model/hooks', () => ({ useModDownloads: vi.fn() }));

type ModDownloads = ReturnType<typeof useModDownloads>;

const COPY = messages.en.mod.hero;
const PUBLISHED: Omit<ModDownloads, 'distribution'> = {
  isPreparing: false,
  manager: { version: '0.2.0', size: '8.4 MB' },
  modpack: { version: '0.10.0', size: '1.2 MB' },
  game: '1.45'
};

const renderActions = ({
  distribution = {},
  downloads = PUBLISHED
}: { distribution?: Partial<ModDownloads['distribution']>; downloads?: Omit<ModDownloads, 'distribution'> } = {}) => {
  vi.mocked(useModDownloads).mockReturnValue({ distribution: { ...MOD_DISTRIBUTION, ...distribution }, ...downloads });

  return render(
    <NextIntlClientProvider locale='en' messages={messages.en}>
      <ModActions />
    </NextIntlClientProvider>
  );
};

describe('ModActions', () => {
  it('makes the manager installer the primary download', () => {
    renderActions();

    const manager = screen.getByRole('link', { name: COPY.download });

    expect(manager).toHaveAttribute('href', MOD_DISTRIBUTION.managerUrl);
    expect(manager).toHaveAttribute('download', MOD_DISTRIBUTION.managerFileName);
  });

  it('points the secondary action at the component list', () => {
    renderActions();

    expect(screen.getByRole('link', { name: COPY.inside })).toHaveAttribute('href', `#${ROUTE_ANCHORS.modFeatures}`);
  });

  it('keeps the packages as the manual download', () => {
    renderActions();

    expect(screen.getByRole('link', { name: COPY.manual })).toHaveAttribute('href', MOD_DISTRIBUTION.packagesUrl);
  });

  it('shows the published version, size and supported client', () => {
    renderActions();

    expect(screen.getByText('Version 0.2.0 · 8.4 MB · Windows 10 and 11')).toBeInTheDocument();
    expect(screen.getByText('Client 1.45')).toBeInTheDocument();
  });

  it('leaves the client out while the release history is unknown', () => {
    renderActions({ downloads: { ...PUBLISHED, game: null } });

    expect(screen.queryByText(/^Client /)).not.toBeInTheDocument();
  });

  it('disables the download and explains why before the first release', () => {
    renderActions({ downloads: { isPreparing: true, manager: null, modpack: null, game: null } });

    expect(screen.getByRole('button', { name: COPY.download })).toBeDisabled();
    expect(screen.queryByRole('link', { name: COPY.manual })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent(COPY.preparing);
  });

  it('keeps the download disabled and silent while the status loads', () => {
    renderActions({ downloads: { isPreparing: false, manager: null, modpack: null, game: null } });

    expect(screen.getByRole('button', { name: COPY.download })).toBeDisabled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
  });
});
