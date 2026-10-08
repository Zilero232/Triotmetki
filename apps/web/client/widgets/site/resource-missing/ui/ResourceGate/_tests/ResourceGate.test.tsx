import { fireEvent, render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { notFound } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';

import { NotFoundError } from '@/shared/api/source';
import { messages } from '@/shared/i18n';

import type { ResourceGateProps } from '../ResourceGate.types';

import { ResourceGate } from '../ResourceGate';

vi.mock('next/navigation', () => ({ notFound: vi.fn() }));

vi.mock('@/shared/i18n/navigation', () => ({
  Link: ({ href, children }: { href: string; children: React.ReactNode }) => <a href={href}>{children}</a>
}));

const QUERY: ResourceGateProps<string>['query'] = { data: undefined, isError: false, error: null, refetch: vi.fn() };

const renderGate = (props: Partial<ResourceGateProps<string>>) =>
  render(
    <NextIntlClientProvider locale='ru' messages={messages.ru}>
      <ResourceGate
        back={{ href: '/tanks', label: 'Back' }}
        error={{ title: 'Failed' }}
        notFound={{ title: 'Missing' }}
        query={QUERY}
        skeleton={<p>Loading</p>}
        {...props}
      >
        {(name) => <h1>{name}</h1>}
      </ResourceGate>
    </NextIntlClientProvider>
  );

describe('ResourceGate', () => {
  it('shows the skeleton while the resource loads', () => {
    renderGate({});

    expect(screen.getByText('Loading')).toBeInTheDocument();
  });

  it('renders the loaded resource', () => {
    renderGate({ query: { ...QUERY, data: 'IS-7' } });

    expect(screen.getByRole('heading', { name: 'IS-7' })).toBeInTheDocument();
  });

  it('tells a missing resource apart from a failed request', () => {
    renderGate({ query: { ...QUERY, isError: true, error: new NotFoundError() } });

    expect(screen.getByText('Missing')).toBeInTheDocument();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('retries a failed request', () => {
    const refetch = vi.fn();

    renderGate({ query: { ...QUERY, isError: true, error: new Error('boom'), refetch } });
    fireEvent.click(screen.getByRole('button'));

    expect(screen.getByText('Failed')).toBeInTheDocument();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('falls through to the not-found page without a not-found message', () => {
    renderGate({ query: { ...QUERY, isError: true }, isNotFound: true, notFound: undefined });

    expect(notFound).toHaveBeenCalled();
  });

  it('keeps the page header over a failed request', () => {
    renderGate({ header: <h1>Clan workspace</h1>, query: { ...QUERY, isError: true, error: new Error('boom') } });

    expect(screen.getByRole('heading', { name: 'Clan workspace' })).toBeInTheDocument();
  });
});
