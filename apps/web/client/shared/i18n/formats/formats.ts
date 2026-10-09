import type { Formats } from 'next-intl';

export const FORMATS = {
  number: {
    integer: { maximumFractionDigits: 0 },
    decimal1: { minimumFractionDigits: 1, maximumFractionDigits: 1 },
    decimal2: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
    percent: { style: 'percent', maximumFractionDigits: 2 },
    percent2: { style: 'percent', minimumFractionDigits: 2, maximumFractionDigits: 2 },
    share: { style: 'percent', maximumFractionDigits: 0 },
    signed: { signDisplay: 'exceptZero', maximumFractionDigits: 2 },
    signedPercent: { style: 'percent', signDisplay: 'exceptZero', maximumFractionDigits: 2 },
    compact: { notation: 'compact', maximumFractionDigits: 1 }
  },
  dateTime: {
    date: { day: 'numeric', month: 'short', year: 'numeric' },
    dateTime: { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' },
    time: { hour: '2-digit', minute: '2-digit' }
  }
} as const satisfies Formats;

export type NumberFormatName = keyof typeof FORMATS.number;
