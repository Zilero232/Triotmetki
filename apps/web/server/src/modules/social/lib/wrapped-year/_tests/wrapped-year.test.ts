import { describe, expect, it } from 'vitest';

import { moscowMonth, moscowYear, wrappedYearWindow } from '../wrapped-year';

describe('wrappedYearWindow', () => {
  it('starts and ends the year at Moscow midnight on January 1', () => {
    expect(wrappedYearWindow(2025)).toEqual({ start: new Date('2024-12-31T21:00:00Z'), end: new Date('2025-12-31T21:00:00Z') });
  });
});

describe('moscowYear', () => {
  it('counts the last UTC evening of the year as the next Moscow year', () => {
    expect(moscowYear(new Date('2025-12-31T22:00:00Z'))).toBe(2026);
  });

  it('keeps the UTC year before Moscow midnight', () => {
    expect(moscowYear(new Date('2025-12-31T20:59:59Z'))).toBe(2025);
  });
});

describe('moscowMonth', () => {
  it('reads the month of a Moscow month start as that month', () => {
    expect(moscowMonth(new Date('2025-03-31T21:00:00Z'))).toBe(4);
  });
});
