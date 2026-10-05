import { describe, expect, it } from 'vitest';

import { matchDonation } from '../donation-match';

const challenges = [
  { id: 'c1', code: 'ABCDE', amount: 500, currency: 'RUB' },
  { id: 'c2', code: 'XYZ23', amount: 1000, currency: 'RUB' }
];

describe('matchDonation', () => {
  it('matches the challenge whose code is in the message and whose price is paid', () => {
    expect(matchDonation({ message: 'Го #abcde на ЛТ!', amount: 500, currency: 'RUB', challenges })?.id).toBe('c1');
  });

  it('ignores a donation below the challenge price', () => {
    expect(matchDonation({ message: '#XYZ23', amount: 999.99, currency: 'RUB', challenges })).toBeNull();
  });

  it('ignores a donation in another currency', () => {
    expect(matchDonation({ message: '#ABCDE', amount: 500, currency: 'USD', challenges })).toBeNull();
  });

  it('ignores a message without a known code', () => {
    expect(matchDonation({ message: 'просто донат', amount: 5000, currency: 'RUB', challenges })).toBeNull();
    expect(matchDonation({ message: '#QQQQQ', amount: 5000, currency: 'RUB', challenges })).toBeNull();
  });

  it('accepts a code written without the hash', () => {
    expect(matchDonation({ message: 'xyz23 please', amount: 1000, currency: 'rub', challenges })?.id).toBe('c2');
  });
});
