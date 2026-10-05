// @vitest-environment jsdom
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RU } from '@/shared/i18n/strings';

import { CAROUSEL_PREVIEW } from '../../../../config';
import { CarouselPreview } from '../CarouselPreview';

const rowsOf = (container: HTMLElement) => container.querySelectorAll('[class*="row"]');

describe(CarouselPreview, () => {
  it('draws as many rows of tanks as the player chose', () => {
    const { container } = render(<CarouselPreview model={{ rows: 4, small: false }} />);

    expect(rowsOf(container)).toHaveLength(4);
    expect(screen.getByText(`${RU.carouselPreviewRows}: 4`)).toBeTruthy();
  });

  it('shows one row and says the game decides when the choice is the game option', () => {
    const { container } = render(<CarouselPreview model={{ rows: null, small: false }} />);

    expect(rowsOf(container)).toHaveLength(CAROUSEL_PREVIEW.nativeRows);
    expect(screen.getByText(RU.carouselPreviewNative)).toBeTruthy();
  });

  it('fills every row with the same number of tiles', () => {
    const { container } = render(<CarouselPreview model={{ rows: 2, small: true }} />);

    expect(container.querySelectorAll('[class*="tileShape"]')).toHaveLength(2 * CAROUSEL_PREVIEW.columns);
  });
});
