import type { SessionTankDelta, StatsBlock, VehicleSummary } from '@otmetki/schemas';

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/i18n';

import { SessionTanks } from '../SessionTanks';

const VEHICLE: VehicleSummary = {
  tankId: 1,
  name: 'E 100',
  shortName: 'E 100',
  slug: 'e-100',
  nation: 'germany',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null }
};

const STATS: StatsBlock = {
  battles: 27,
  winRate: 55.56,
  avgDamage: 5618.333,
  avgFrags: 1.1,
  avgSpotted: 1.3,
  avgXp: 700,
  avgBlocked: 500,
  avgAssisted: 800,
  survivalRate: 38.5,
  accuracy: 80.1,
  avgTier: 10,
  wn8: { value: null, tier: null },
  eff: { value: null, tier: null },
  broneIndex: { value: null, tier: null }
};

const renderTanks = (tanks: SessionTankDelta[]) =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en}>
      <SessionTanks tanks={tanks} />
    </NextIntlClientProvider>
  );

describe('SessionTanks', () => {
  it('rounds the average damage to whole points', () => {
    renderTanks([{ vehicle: VEHICLE, stats: STATS }]);

    expect(screen.getByText('5,618')).toBeInTheDocument();
  });

  it('shows a dash instead of zero when the tank has no WN8', () => {
    renderTanks([{ vehicle: VEHICLE, stats: STATS }]);

    expect(screen.getByText('—')).toBeInTheDocument();
    expect(screen.queryByText('0')).toBeNull();
  });
});
