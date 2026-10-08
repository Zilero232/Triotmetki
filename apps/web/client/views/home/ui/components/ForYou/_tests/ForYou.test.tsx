import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { messages } from '@/shared/i18n';
import { useForYou } from '@/views/home/model/hooks/use-for-you/use-for-you';

import { ForYou } from '../ForYou';

vi.mock('@/views/home/model/hooks/use-for-you/use-for-you', () => ({ useForYou: vi.fn() }));

const STATE = { isPending: false, isVisible: false, nickname: 'Jove', firstWin: null, leagueRank: null, challenges: null };

const renderForYou = () =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      <ForYou />
    </NextIntlClientProvider>
  );

describe('ForYou', () => {
  it('reserves its block while the session is being checked', () => {
    vi.mocked(useForYou).mockReturnValue({ ...STATE, isPending: true });

    const { container } = renderForYou();

    expect(container.firstChild).not.toBeNull();
  });

  it('renders nothing for a guest', () => {
    vi.mocked(useForYou).mockReturnValue(STATE);

    const { container } = renderForYou();

    expect(container.firstChild).toBeNull();
  });
});
