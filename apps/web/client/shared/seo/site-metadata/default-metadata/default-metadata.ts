import type { Metadata, Viewport } from 'next';

import { SITE } from '@/shared/config';
import { DEFAULT_LOCALE } from '@/shared/i18n';

import { siteImage } from '../site-metadata';

export const defaultMetadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s · ${SITE.name}`
  },
  description: SITE.description,
  applicationName: SITE.name,
  referrer: 'origin-when-cross-origin',
  formatDetection: { email: false, address: false, telephone: false },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE.url,
    siteName: SITE.name,
    title: SITE.title,
    description: SITE.description,
    images: [siteImage(DEFAULT_LOCALE)]
  },
  twitter: {
    card: 'summary_large_image',
    title: SITE.title,
    description: SITE.description,
    images: [siteImage(DEFAULT_LOCALE)]
  },
  robots: {
    index: false,
    follow: false
  }
};

export const defaultViewport: Viewport = {
  themeColor: SITE.themeColor.dark,
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover'
};
