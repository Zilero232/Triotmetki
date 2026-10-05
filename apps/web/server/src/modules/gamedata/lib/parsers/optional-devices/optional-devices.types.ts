import type { Modifier, ModifierCondition } from '@otmetki/gamedata';

import type { XmlNode } from '../../xml/xml.types';

export type SpecialModifierInput = {
  script: XmlNode;
  param: string;
  attribute: string;
  op: Modifier['op'];
  condition?: ModifierCondition;
};

export type DeviceKindInput = {
  name: string;
  tags: string[];
};

export type ScriptModifiersInput = {
  script: XmlNode;
  kind: string | undefined;
};
