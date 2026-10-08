import { expect, test } from '@playwright/test';

import { ROUTES } from '../apps/web/client/shared/constants/routes';
import { waitForHydration } from './support/hydration';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const OFFLINE_PAGES = ['/en', '/en/tanks', '/en/marks'] as const;

const EN_LESTA_COPYRIGHT = '© Lesta Games. All rights reserved.';

const LOCALES = [
  {
    name: 'ru',
    browserLocale: 'ru-RU',
    home: ROUTES.home,
    title: /Три отметки/,
    searchPlaceholder: 'Ник игрока, танк или тег клана…',
    lestaCopyright: '© Леста Игры. Все права защищены.'
  },
  {
    name: 'en',
    browserLocale: 'en-US',
    home: '/en',
    title: /Three Marks|Три отметки/,
    searchPlaceholder: /./,
    lestaCopyright: EN_LESTA_COPYRIGHT
  }
] as const;

for (const locale of LOCALES) {
  test.describe(`smoke — ${locale.name}`, () => {
    test.use({ locale: locale.browserLocale });

    test('the home page renders', async ({ page }) => {
      const response = await page.goto(locale.home);

      expect(response?.status()).toBe(200);
      await expect(page).toHaveTitle(locale.title);
      await expect(page.locator('main')).toBeVisible();
    });

    test('the command palette opens on Ctrl+K', async ({ page }) => {
      await page.goto(locale.home);
      await waitForHydration(page.locator('header').getByRole('button').first());

      await expect(async () => {
        await page.keyboard.press('Control+k');
        await expect(page.getByRole('dialog')).toBeVisible({ timeout: 2_000 });
      }).toPass();

      await expect(page.getByRole('dialog').getByRole('combobox')).toHaveAttribute('placeholder', locale.searchPlaceholder);
    });

    test('the footer carries the Lesta attribution', async ({ page }) => {
      await page.goto(locale.home);

      const footer = page.getByRole('contentinfo');

      await expect(footer).toContainText(locale.lestaCopyright);
      await expect(footer.getByRole('link', { name: 'tanki.su', exact: true })).toHaveAttribute('href', /tanki\.su/);
    });
  });
}

test('an unknown route renders the not-found page', async ({ page }) => {
  const response = await page.goto('/en/definitely-not-a-real-route');

  expect(response?.status()).toBe(404);
  await expect(page.getByRole('contentinfo')).toContainText(EN_LESTA_COPYRIGHT);
});

test('the Telegram mini app carries the Lesta attribution', async ({ page }) => {
  await page.goto('/en/tg');

  const footer = page.getByRole('contentinfo');

  await expect(footer).toContainText(EN_LESTA_COPYRIGHT);
  await expect(footer.getByRole('link', { name: 'tanki.su', exact: true })).toHaveAttribute('href', /tanki\.su/);
});

test.describe('without the API', () => {
  test.beforeEach(async ({ page }) => {
    await page.route(`${API_URL}/**`, (route) => route.abort());
  });

  for (const path of OFFLINE_PAGES) {
    test(`${path} falls back to its error state with a retry`, async ({ page }) => {
      const response = await page.goto(path);

      expect(response?.status()).toBe(200);
      await expect(page.locator('main')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Retry' }).first()).toBeVisible();
      await expect(page.getByRole('contentinfo')).toBeVisible();
    });
  }

  test('the home page shows the server stats error instead of numbers', async ({ page }) => {
    await page.goto('/en');

    await expect(page.getByRole('complementary', { name: 'Server now' }).getByRole('button', { name: 'Retry' })).toBeVisible({ timeout: 30_000 });
  });
});
