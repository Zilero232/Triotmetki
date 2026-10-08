import type { ReactElement } from 'react';

import { render } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { describe, expect, it } from 'vitest';

import { messages } from '@/shared/i18n';

import { Breadcrumbs } from '../Breadcrumbs';

const ITEMS = [{ label: 'Blog', href: '/blog' }, { label: 'Patch notes' }];

const renderWithIntl = (ui: ReactElement) =>
  render(
    <NextIntlClientProvider locale='en' messages={messages.en} timeZone='UTC'>
      {ui}
    </NextIntlClientProvider>
  );

const schemaScripts = (container: HTMLElement) => container.querySelectorAll('script[type="application/ld+json"]');

describe('Breadcrumbs', () => {
  it('describes the trail as a BreadcrumbList', () => {
    const { container } = renderWithIntl(<Breadcrumbs items={ITEMS} />);

    expect(schemaScripts(container)).toHaveLength(1);
  });

  it('leaves the structured data to the page when asked', () => {
    const { container } = renderWithIntl(<Breadcrumbs items={ITEMS} withSchema={false} />);

    expect(schemaScripts(container)).toHaveLength(0);
  });
});
