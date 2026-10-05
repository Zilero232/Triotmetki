import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

import { SIGNATURE, TIER_COLORS } from '../../../config/signature.constants';
import { renderSignature, signatureTree } from '../signature';

const fonts = [
  {
    name: SIGNATURE.fontNames.display,
    data: readFileSync(new URL(`../../../assets/fonts/${SIGNATURE.fontFiles.display}`, import.meta.url)),
    weight: 700 as const,
    style: 'normal' as const
  },
  {
    name: SIGNATURE.fontNames.body,
    data: readFileSync(new URL(`../../../assets/fonts/${SIGNATURE.fontFiles.body}`, import.meta.url)),
    weight: 500 as const,
    style: 'normal' as const
  }
];

const data = { nickname: 'Tanker', clanTag: 'BRNV', battles: 12_345, winRate: 0.5321, wn8: 2100, avgDamage: 1850 };

describe('signatureTree', () => {
  it('paints the accent in the colour of the WN8 tier', () => {
    expect(Object.values(TIER_COLORS)).toContain(String(signatureTree(data).props.style?.borderLeft).split(' ').at(-1));
  });

  it('shows placeholders for a player without ratings', () => {
    expect(JSON.stringify(signatureTree({ ...data, wn8: null, winRate: null, battles: null, avgDamage: null }))).toContain(SIGNATURE.missing);
  });
});

describe('renderSignature', () => {
  it('renders a PNG of the configured size', async () => {
    const png = await renderSignature({ data, fonts });

    expect(png.subarray(1, 4).toString()).toBe('PNG');
    expect(png.readUInt32BE(16)).toBe(SIGNATURE.width);
    expect(png.readUInt32BE(20)).toBe(SIGNATURE.height);
  });
});
