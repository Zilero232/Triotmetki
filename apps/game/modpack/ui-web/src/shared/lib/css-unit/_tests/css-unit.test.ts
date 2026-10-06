import { describe, expect, it } from 'vitest';

import { optionalRem, rem, remBox, remRect, remSquare } from '../css-unit';

describe(rem, () => {
  it('writes a design length in rem', () => {
    expect(rem(12.5)).toBe('12.5rem');
  });
});

describe(optionalRem, () => {
  it('keeps a missing length missing', () => {
    expect(optionalRem(undefined)).toBeUndefined();
  });

  it('writes a given length in rem', () => {
    expect(optionalRem(4)).toBe('4rem');
  });
});

describe(remBox, () => {
  it('writes both sides in rem', () => {
    expect(remBox({ width: 13, height: 16 })).toEqual({ width: '13rem', height: '16rem' });
  });
});

describe(remSquare, () => {
  it('uses one size for both sides', () => {
    expect(remSquare(8)).toEqual({ width: '8rem', height: '8rem' });
  });
});

describe(remRect, () => {
  it('writes the position and the size in rem', () => {
    expect(remRect({ left: 1, top: 2, width: 3, height: 4 })).toEqual({ left: '1rem', top: '2rem', width: '3rem', height: '4rem' });
  });
});
