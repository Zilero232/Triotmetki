import type { CosmeticInventoryItem } from '@otmetki/schemas';

import { fireEvent, render, screen, within } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it, vi } from 'vitest';

import { ROUTES } from '@/shared/constants';
import { localePath, messages } from '@/shared/i18n';

import type { CosmeticAction } from '../../../../lib/cosmetic-action';

import { CosmeticTile } from '../CosmeticTile';

const ITEM: CosmeticInventoryItem = {
  code: 'badge-sniper',
  slot: 'badge',
  source: 'shop',
  price: 300,
  season: null,
  grade: null,
  isOwned: false,
  isUsable: false,
  acquiredAt: null
};

type RenderTileInput = {
  action: CosmeticAction;
  item?: CosmeticInventoryItem;
  onBuy?: (code: string) => void;
};

const renderTile = ({ action, item = ITEM, onBuy = vi.fn() }: RenderTileInput) =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      <CosmeticTile action={action} isBusy={false} item={item} onBuy={onBuy} onEquip={vi.fn()} />
    </NextIntlClientProvider>
  );

describe('CosmeticTile', () => {
  it('asks before spending casings', () => {
    const onBuy = vi.fn();

    renderTile({ action: 'buy', onBuy });

    fireEvent.click(screen.getByRole('button', { name: /Buy/ }));

    expect(screen.getByRole('alertdialog')).toBeInTheDocument();
    expect(onBuy).not.toHaveBeenCalled();
  });

  it('buys the item once confirmed', () => {
    const onBuy = vi.fn();

    renderTile({ action: 'buy', onBuy });
    fireEvent.click(screen.getByRole('button', { name: /Buy/ }));

    fireEvent.click(within(screen.getByRole('alertdialog')).getByRole('button', { name: /Buy/ }));

    expect(onBuy).toHaveBeenCalledWith(ITEM.code);
  });

  it('links a Plus item to the Plus page', () => {
    renderTile({ action: 'plus', item: { ...ITEM, source: 'plus', price: null } });

    expect(screen.getByRole('link', { name: messages.en.cosmetics.plusOnly })).toHaveAttribute(
      'href',
      localePath({ path: ROUTES.plus, locale: 'en' })
    );
  });
});
