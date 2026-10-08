import type { VehicleSummary } from '@otmetki/schemas';

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/i18n';

import { ColumnHead } from '../ColumnHead';

const VEHICLE: VehicleSummary = {
  tankId: 7169,
  name: 'IS-7',
  shortName: 'IS-7',
  slug: 'is-7',
  nation: 'ussr',
  type: 'heavyTank',
  tier: 10,
  isPremium: false,
  isCollectible: false,
  status: 'researchable',
  images: { small: null, contour: null, big: null, large: null }
};

const renderHead = ({ isStatsError, onRetryStats = vi.fn() }: { isStatsError: boolean; onRetryStats?: () => void }) =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      <ColumnHead isStatsError={isStatsError} vehicle={VEHICLE} onRemove={vi.fn()} onRetryStats={onRetryStats} />
    </NextIntlClientProvider>
  );

describe('ColumnHead', () => {
  it('tells which tank lost its stats and retries only that tank', () => {
    const onRetryStats = vi.fn();

    renderHead({ isStatsError: true, onRetryStats });

    fireEvent.click(screen.getByRole('button', { name: messages.en.common.retry }));

    expect(onRetryStats).toHaveBeenCalledTimes(1);
  });

  it('stays quiet while the stats are fine', () => {
    renderHead({ isStatsError: false });

    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });
});
