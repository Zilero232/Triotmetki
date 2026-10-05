import type { TierIconProps } from '../icons.types';

import { IconBase, tierGlyphs, toRoman } from '../../lib';

const TIER_PLATE = {
  outline: 'M4.5 3.5h15l2.5 2.5v12l-2.5 2.5h-15L2 18V6Z',
  bevel: 'M5.2 5h13.6',
  rivets: 'M4.3 6.2h.01M19.7 6.2h.01M4.3 17.8h.01M19.7 17.8h.01',
  fillOpacity: 0.14,
  shadowOpacity: 0.35,
  shadowShift: 'translate(0 0.7)'
} as const;

export const TierIcon = ({ tier, withRails = true, engraved = false, title, ...props }: TierIconProps) => {
  const { numeral, rails } = tierGlyphs(tier);

  if (engraved) {
    return (
      <IconBase data-engraved name={`tier-${tier}`} title={title ?? toRoman(tier)} {...props}>
        <path d={TIER_PLATE.outline} fill='currentColor' fillOpacity={TIER_PLATE.fillOpacity} />
        <path d={TIER_PLATE.bevel} strokeOpacity={TIER_PLATE.shadowOpacity} />
        <path d={TIER_PLATE.rivets} />
        <path d={numeral} strokeOpacity={TIER_PLATE.shadowOpacity} transform={TIER_PLATE.shadowShift} />
        <path d={numeral} />
      </IconBase>
    );
  }

  return (
    <IconBase name={`tier-${tier}`} title={title ?? toRoman(tier)} {...props}>
      {withRails && <path d={rails} />}
      <path d={numeral} />
    </IconBase>
  );
};
