import type { ComponentProps, ReactElement } from 'react';

import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import type { OffsetInfiniteList } from '@/shared/lib';

import { messages } from '@/shared/i18n';

import { PagedList } from '../PagedList';

type Item = { id: number; title: string };

const ITEMS: Item[] = [
  { id: 1, title: 'First guide' },
  { id: 2, title: 'Second guide' }
];

const LABEL = 'Guides';
const EMPTY = 'Nothing here yet';

const LIST: OffsetInfiniteList<Item> = {
  items: ITEMS,
  total: ITEMS.length,
  isPending: false,
  isError: false,
  error: null,
  isRetrying: false,
  hasNextPage: false,
  hasMore: false,
  isFetchingNextPage: false,
  loadMore: () => undefined,
  retry: () => undefined,
  query: { data: ITEMS, isError: false, isRefetching: false, refetch: () => undefined }
};

const BASE: ComponentProps<typeof PagedList<Item>> = {
  list: LIST,
  getKey: (item) => item.id,
  renderItem: (item) => item.title,
  empty: EMPTY,
  label: LABEL
};

const withList = (list: Partial<OffsetInfiniteList<Item>>) => ({ ...LIST, ...list });

const renderWithIntl = (ui: ReactElement) =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      {ui}
    </NextIntlClientProvider>
  );

const region = () => screen.getByRole('region', { name: LABEL });

describe('PagedList', () => {
  it('lists every item in order', () => {
    renderWithIntl(<PagedList {...BASE} />);

    expect(
      within(region())
        .getAllByRole('listitem')
        .map((item) => item.textContent)
    ).toEqual(ITEMS.map((item) => item.title));
  });

  it('shows the empty state when there are no items', () => {
    renderWithIntl(<PagedList {...BASE} list={withList({ items: [] })} />);

    expect(within(region()).getByText(EMPTY)).toBeInTheDocument();
    expect(screen.queryByRole('list')).not.toBeInTheDocument();
  });

  it('marks itself busy while the first page loads', () => {
    renderWithIntl(<PagedList {...BASE} list={withList({ isPending: true, items: [] })} />);

    expect(region()).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText(EMPTY)).not.toBeInTheDocument();
  });

  it('draws the requested number of placeholders while loading', () => {
    const skeletonCount = 3;

    renderWithIntl(<PagedList {...BASE} list={withList({ isPending: true })} skeletonCount={skeletonCount} />);

    expect(region().querySelectorAll('[aria-hidden="true"]')).toHaveLength(skeletonCount);
  });

  it('offers a retry when the first page failed', async () => {
    const user = userEvent.setup();
    const onRetry = vi.fn<() => undefined>();

    renderWithIntl(<PagedList {...BASE} list={withList({ isError: true, items: [], retry: onRetry })} />);

    await user.click(within(region()).getByRole('button', { name: messages.en.common.retry }));

    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps showing loaded items when a later page failed', () => {
    renderWithIntl(<PagedList {...BASE} list={withList({ isError: true, hasNextPage: true })} />);

    expect(within(region()).getAllByRole('listitem')).toHaveLength(ITEMS.length);
  });

  it('reports a failed later page inline and retries that page', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn<() => undefined>();

    renderWithIntl(<PagedList {...BASE} list={withList({ isError: true, hasNextPage: true, loadMore: onLoadMore })} />);

    expect(screen.getByRole('alert')).toHaveTextContent(messages.en.common.loadMoreError);

    await user.click(screen.getByRole('button', { name: messages.en.common.retry }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('marks itself busy while the next page loads', () => {
    renderWithIntl(<PagedList {...BASE} list={withList({ hasNextPage: true, isFetchingNextPage: true })} />);

    expect(region()).toHaveAttribute('aria-busy', 'true');
  });

  it('loads the next page on demand', async () => {
    const user = userEvent.setup();
    const onLoadMore = vi.fn<() => undefined>();

    renderWithIntl(<PagedList {...BASE} list={withList({ hasNextPage: true, loadMore: onLoadMore })} />);

    await user.click(screen.getByRole('button', { name: messages.en.common.showMore }));

    expect(onLoadMore).toHaveBeenCalledTimes(1);
  });

  it('blocks a second request while the next page is loading', () => {
    renderWithIntl(<PagedList {...BASE} list={withList({ hasNextPage: true, isFetchingNextPage: true })} />);

    expect(screen.getByRole('button', { name: messages.en.common.showMore })).toBeDisabled();
  });

  it('hides the load-more control on the last page', () => {
    renderWithIntl(<PagedList {...BASE} />);

    expect(screen.queryByRole('button', { name: messages.en.common.showMore })).not.toBeInTheDocument();
  });

  it('uses a custom load-more label when given', () => {
    renderWithIntl(<PagedList {...BASE} list={withList({ hasNextPage: true })} moreLabel='More guides' />);

    expect(screen.getByRole('button', { name: 'More guides' })).toBeInTheDocument();
  });
});
