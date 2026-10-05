import { Resvg } from '@resvg/resvg-js';
import satori from 'satori';

import type { SignatureData } from '../../social.types';
import type { NodeInput, RenderSignatureInput, SignatureNode, StatInput } from './signature.types';

import { formatNumberOr, formatPercentOr, ratingValue } from '../../../../common/lib';
import { SIGNATURE, TIER_COLORS } from '../../config/signature.constants';

const div = ({ style, children }: NodeInput): SignatureNode => ({
  type: 'div',
  key: null,
  props: { style, ...(children === undefined ? {} : { children }) }
});

const stat = ({ label, value, color }: StatInput): SignatureNode =>
  div({
    style: { display: 'flex', flexDirection: 'column', alignItems: 'flex-start', marginRight: 22 },
    children: [
      div({ style: { fontSize: 11, color: SIGNATURE.muted }, children: label }),
      div({ style: { fontSize: 22, color, fontFamily: SIGNATURE.fontNames.display }, children: value })
    ]
  });

export const signatureTree = (data: SignatureData): SignatureNode => {
  const tier = ratingValue({ kind: 'wn8', value: data.wn8 }).tier;
  const wn8Color = tier ? TIER_COLORS[tier] : SIGNATURE.foreground;
  const { locale, missing } = SIGNATURE;

  return div({
    style: {
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'space-between',
      width: SIGNATURE.width,
      height: SIGNATURE.height,
      padding: '10px 14px',
      backgroundColor: SIGNATURE.background,
      color: SIGNATURE.foreground,
      fontFamily: SIGNATURE.fontNames.body,
      borderLeft: `4px solid ${wn8Color}`
    },
    children: [
      div({
        style: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
        children: [
          div({
            style: { fontSize: 18, fontFamily: SIGNATURE.fontNames.display },
            children: data.clanTag ? `${data.nickname} [${data.clanTag}]` : data.nickname
          }),
          div({ style: { fontSize: 11, color: SIGNATURE.accent }, children: SIGNATURE.brand })
        ]
      }),
      div({
        style: { display: 'flex' },
        children: [
          stat({ label: 'WN8', value: formatNumberOr({ value: data.wn8, locale, missing }), color: wn8Color }),
          stat({ label: 'WR', value: formatPercentOr({ value: data.winRate, locale, missing }), color: SIGNATURE.foreground }),
          stat({ label: 'DMG', value: formatNumberOr({ value: data.avgDamage, locale, missing }), color: SIGNATURE.foreground }),
          stat({ label: 'BATTLES', value: formatNumberOr({ value: data.battles, locale, missing }), color: SIGNATURE.foreground })
        ]
      })
    ]
  });
};

export const renderSignature = async ({ data, fonts }: RenderSignatureInput): Promise<Buffer> => {
  const svg = await satori(signatureTree(data), { width: SIGNATURE.width, height: SIGNATURE.height, fonts: [...fonts] });

  return new Resvg(svg, { fitTo: { mode: 'original' } }).render().asPng();
};
