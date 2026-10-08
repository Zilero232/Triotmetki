import { expect, test } from '@playwright/test';

import { ROUTES } from '../apps/web/client/shared/constants/routes';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const ARMOR_PAGE = `/en${ROUTES.tanks.armor('r45-is-7')}`;

test.describe('armor viewer', () => {
  test('renders the canvas, or its empty or error state, with the attribution', async ({ page }) => {
    const response = await page.goto(ARMOR_PAGE);

    expect(response?.status()).toBe(200);
    await expect(page.locator('main')).toBeVisible();
    await expect(page.getByTestId('armor-attribution')).toContainText('Lesta');
    await expect(page.getByTestId('armor-attribution').getByRole('link', { name: 'unicum-gg/wot.models' })).toBeVisible();

    await expect(
      page
        .locator('canvas')
        .or(page.getByRole('heading', { name: 'No 3D armor model yet' }))
        .or(page.getByRole('button', { name: /retry|again/i }))
    ).toBeVisible();
  });

  test('falls back to the error state with a retry when the API is down', async ({ page }) => {
    await page.route(`${API_URL}/**`, (route) => route.abort());

    const response = await page.goto(ARMOR_PAGE);

    expect(response?.status()).toBe(200);
    await expect(page.getByRole('heading', { name: /load the armor model/i })).toBeVisible();
    await expect(page.getByTestId('armor-attribution')).toBeVisible();
  });
});
