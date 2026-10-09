import type { ReactElement } from 'react';

import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/i18n';

import { RetryButton } from '../RetryButton';

const COMMON = messages.en.common;

const renderWithIntl = (ui: ReactElement) =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      {ui}
    </NextIntlClientProvider>
  );

describe('RetryButton', () => {
  it('reports a running retry as busy', () => {
    renderWithIntl(<RetryButton disabled />);

    expect(screen.getByRole('button', { name: COMMON.retry })).toHaveAttribute('aria-busy', 'true');
  });

  it('is not busy while idle', () => {
    renderWithIntl(<RetryButton />);

    expect(screen.getByRole('button', { name: COMMON.retry })).not.toHaveAttribute('aria-busy');
  });
});
