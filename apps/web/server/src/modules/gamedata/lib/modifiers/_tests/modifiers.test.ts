import { describe, expect, it } from 'vitest';

import { parseXml } from '../../xml/xml';
import { parseFactorBlock, parseModifierBlock } from '../modifiers';

describe('modifier blocks', () => {
  it('reads optional device factors with a specialization value', () => {
    const root = parseXml(`<root><factors>
      <factor><attribute>miscAttrs/gunReloadTimeFactor</attribute><type>mul</type><valueByLevel>0.9 0.885</valueByLevel></factor>
      <factor><attribute>miscAttrs/crewLevelIncrease</attribute><type>add</type><valueByLevel>5.0</valueByLevel></factor>
    </factors></root>`);

    expect(parseFactorBlock(root.factors)).toEqual([
      { attribute: 'miscAttrs/gunReloadTimeFactor', op: 'mul', value: 0.9, specValue: 0.885 },
      { attribute: 'miscAttrs/crewLevelIncrease', op: 'add', value: 5 }
    ]);
  });

  it('reads field modification modifiers grouped by operation', () => {
    const root = parseXml(`<root><modifiers>
      <mul><name>miscAttrs/healthFactor</name><value>1.01</value></mul>
      <add><name>miscAttrs/forwardMaxSpeedKMHTerm</name><value>2</value></add>
    </modifiers></root>`);

    expect(parseModifierBlock(root.modifiers)).toEqual([
      { attribute: 'miscAttrs/healthFactor', op: 'mul', value: 1.01 },
      { attribute: 'miscAttrs/forwardMaxSpeedKMHTerm', op: 'add', value: 2 }
    ]);
  });
});
