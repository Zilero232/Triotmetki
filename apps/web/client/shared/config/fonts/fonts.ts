import { Fira_Sans, Fira_Sans_Condensed, JetBrains_Mono } from 'next/font/google';

const fontCondensed = Fira_Sans_Condensed({
  subsets: ['latin', 'cyrillic'],
  weight: ['500', '600', '700'],
  variable: '--font-condensed',
  display: 'swap',
  fallback: ['Arial Narrow', 'sans-serif']
});

const fontBody = Fira_Sans({
  subsets: ['latin', 'cyrillic'],
  weight: ['400', '500'],
  variable: '--font-body',
  display: 'swap',
  fallback: ['system-ui', 'sans-serif']
});

const fontCode = JetBrains_Mono({
  subsets: ['latin', 'cyrillic'],
  weight: ['400'],
  variable: '--font-code',
  display: 'swap',
  preload: false,
  fallback: ['ui-monospace', 'monospace']
});

export const FONT_VARIABLES = [fontCondensed.variable, fontBody.variable, fontCode.variable] as const;
