import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { LestaAttribution } from '@/entities/app/lesta-attribution';
import { EXTERNAL_LINKS } from '@/shared/config';
import { messages } from '@/shared/i18n';

const COPY = messages.ru.footer;

const renderAttribution = (variant?: 'compact' | 'inline' | 'stacked') =>
  render(
    <NextIntlClientProvider locale='ru' messages={messages.ru} timeZone='UTC'>
      <LestaAttribution variant={variant} />
    </NextIntlClientProvider>
  );

describe('LestaAttribution', () => {
  it('carries the Lesta copyright', () => {
    renderAttribution();

    expect(screen.getByTestId('lesta-attribution')).toHaveTextContent(COPY.lestaCopyright);
  });

  it('links the data source to the game site', () => {
    renderAttribution();

    expect(screen.getByRole('link', { name: COPY.gameSite })).toHaveAttribute('href', EXTERNAL_LINKS.game);
  });

  it('states that the project is unofficial', () => {
    renderAttribution();

    expect(screen.getByTestId('lesta-attribution')).toHaveTextContent(COPY.disclaimer);
  });

  it('links the Lesta support center', () => {
    renderAttribution('stacked');

    expect(screen.getByRole('link', { name: COPY.support })).toHaveAttribute('href', EXTERNAL_LINKS.lestaSupport);
  });

  it('shows a single short line in the compact variant', () => {
    renderAttribution('compact');

    expect(screen.getByTestId('lesta-attribution')).toHaveTextContent(COPY.shortAttribution);
  });
});
