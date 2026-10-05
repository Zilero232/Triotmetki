import { describe, expect, it } from 'vitest';

import { createTokenCipher as createCipher } from './token-cipher.fixtures';

const TOKEN = '0123456789abcdef0123456789abcdef01234567';

describe('TokenCipherService', () => {
  it('stores a token as ciphertext that opens back to the token', async () => {
    const cipher = createCipher('s'.repeat(32));
    const sealed = await cipher.seal(TOKEN);

    expect(sealed).not.toContain(TOKEN);
    expect(await cipher.open(sealed)).toBe(TOKEN);
  });

  it('cannot open a token sealed with another secret', async () => {
    const sealed = await createCipher('s'.repeat(32)).seal(TOKEN);

    await expect(createCipher('o'.repeat(32)).open(sealed)).rejects.toThrow();
  });

  it('passes a token stored before encryption through unchanged', async () => {
    expect(await createCipher('s'.repeat(32)).open(TOKEN)).toBe(TOKEN);
  });
});
