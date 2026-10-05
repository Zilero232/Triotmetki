import type { Modifier } from '@otmetki/gamedata';

import type { XmlNode } from '../../xml/xml.types';

export type EquipmentModifiersInput = {
  script: XmlNode;
  scriptClass: string | undefined;
  tags: string[];
};

export type EquipmentKindInput = {
  equipmentType: string;
  scriptClass: string | undefined;
};

export type OptionalModifierInput = Omit<Modifier, 'value'> & {
  value: number | undefined;
};

export type BoosterModifiersInput = {
  script: XmlNode;
  op: Modifier['op'];
};

export type SkillBoostInput = {
  script: XmlNode;
  scriptClass: string | undefined;
};
