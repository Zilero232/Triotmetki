import type { VehicleSummary } from '@otmetki/schemas';

import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/i18n';

import { RealMedians } from '../RealMedians';

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

const NO_MEDIANS = { premium: null, standard: null, windowDays: 0 };

const renderMedians = ({ isError = false, onRetry = vi.fn() }: { isError?: boolean; onRetry?: () => void }) =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      <RealMedians isError={isError} isPending={false} isRetrying={false} medians={NO_MEDIANS} vehicle={VEHICLE} onRetry={onRetry} />
    </NextIntlClientProvider>
  );

describe('RealMedians', () => {
  it('offers a retry when the medians failed to load', () => {
    const onRetry = vi.fn();

    renderMedians({ isError: true, onRetry });

    fireEvent.click(screen.getByRole('button', { name: messages.en.common.retry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('says there is no data only after a successful empty answer', () => {
    renderMedians({});

    expect(screen.getByText(messages.en.tools.economy.real.emptyTitle.replace('{tank}', 'IS-7'))).toBeInTheDocument();
  });
});
