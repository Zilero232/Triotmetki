import type { ReactNode } from 'react';

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/shared/constants';
import { messages } from '@/shared/i18n';

import { PLUS_GATE } from '../../../config';
import { usePlusTeaser } from '../../../model/hooks';
import { PlusTeaser } from '../PlusTeaser';

vi.mock('@/shared/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: ReactNode }) => <a href={href}>{children}</a>
}));

vi.mock('@/entities/auth/session', () => ({ useLoginHref: () => '/login?next=%2Ft%2Fis-7' }));

vi.mock('../../../model/hooks', () => ({ usePlusTeaser: vi.fn() }));

type Teaser = ReturnType<typeof usePlusTeaser>;

const COPY = messages.en.plus;
const BASE: Teaser = { action: 'subscribe', trialDays: 7, isPending: false, isStarting: false, onStartTrial: vi.fn() };

const renderTeaser = (teaser: Partial<Teaser>) => {
  vi.mocked(usePlusTeaser).mockReturnValue({ ...BASE, ...teaser });

  return render(
    <NextIntlClientProvider locale='en' messages={messages.en}>
      <PlusTeaser feature='analytics' />
    </NextIntlClientProvider>
  );
};

describe('PlusTeaser', () => {
  it('names the locked feature as a labelled region', () => {
    renderTeaser({});

    expect(screen.getByRole('region', { name: COPY.gate.analytics.title })).toBeInTheDocument();
    expect(screen.getByText(COPY.gate.analytics.text)).toBeInTheDocument();
  });

  it('shows no action while the Plus state loads', () => {
    renderTeaser({ isPending: true, action: 'trial' });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('sends a guest to sign in and back', () => {
    renderTeaser({ action: 'signIn' });

    expect(screen.getByRole('link', { name: COPY.teaser.signIn })).toHaveAttribute('href', '/login?next=%2Ft%2Fis-7');
  });

  it('starts the trial from the button and locks it while starting', async () => {
    const onStartTrial = vi.fn();
    const { rerender } = renderTeaser({ action: 'trial', onStartTrial });
    const button = screen.getByRole('button', { name: /7 days/ });

    await userEvent.click(button);

    expect(onStartTrial).toHaveBeenCalledOnce();

    vi.mocked(usePlusTeaser).mockReturnValue({ ...BASE, action: 'trial', isStarting: true, onStartTrial });

    rerender(
      <NextIntlClientProvider locale='en' messages={messages.en}>
        <PlusTeaser feature='analytics' />
      </NextIntlClientProvider>
    );

    expect(screen.getByRole('button', { name: /7 days/ })).toBeDisabled();
  });

  it('offers a promo code and the checkout waitlist while checkout is closed', () => {
    renderTeaser({ action: 'promo' });

    expect(screen.getByRole('link', { name: COPY.teaser.promo })).toHaveAttribute('href', ROUTES.account.billing);
    expect(screen.getByRole('link', { name: COPY.teaser.notify })).toHaveAttribute('href', `${ROUTES.plus}${PLUS_GATE.checkoutHash}`);
  });

  it('links straight to Plus once checkout is open', () => {
    renderTeaser({ action: 'subscribe' });

    expect(screen.getByRole('link', { name: COPY.teaser.subscribe })).toHaveAttribute('href', ROUTES.plus);
  });

  it('offers nothing to an active subscriber', () => {
    renderTeaser({ action: 'active' });

    expect(screen.queryByRole('link')).not.toBeInTheDocument();
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });
});
