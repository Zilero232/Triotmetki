import type { Armor, Nation, Shell, VehicleListEntry } from '@otmetki/gamedata';

import type { XmlNode, XmlValue } from '../../xml/xml.types';

export type SharedComponents = {
  chassis: Record<string, XmlNode>;
  turrets: Record<string, XmlNode>;
  guns: Record<string, XmlNode>;
  engines: Record<string, XmlNode>;
  fuelTanks: Record<string, XmlNode>;
  radios: Record<string, XmlNode>;
};

export type ParseShellsInput = {
  xml: string;
  nation: Nation;
};

export type ParseVehicleInput = {
  xml: string;
  entry: VehicleListEntry;
  components: SharedComponents;
  shells: Record<string, Shell>;
};

export type ModuleContext = {
  nationId: number;
  components: SharedComponents;
  shells: Record<string, Shell>;
};

type ModuleItemType = 'vehicleChassis' | 'vehicleEngine' | 'vehicleFuelTank' | 'vehicleGun' | 'vehicleRadio' | 'vehicleTurret';

export type ResolveModuleInput = {
  name: string;
  value: XmlValue;
  shared: Record<string, XmlNode>;
};

export type ModuleBaseInput = {
  name: string;
  source: XmlNode;
  itemType: ModuleItemType;
  nationId: number;
};

export type ResolvePrimaryArmorInput = {
  armor: Armor;
  value: XmlValue | undefined;
};

export type ModuleParseInput = {
  name: string;
  source: XmlNode;
  context: ModuleContext;
};

export type ParseShotsInput = {
  value: XmlValue | undefined;
  context: ModuleContext;
};

type NamedSource = {
  name: string;
  source: XmlNode;
};

export type ParseModulesInput<T> = {
  value: XmlValue | undefined;
  shared: Record<string, XmlNode>;
  parse: (input: NamedSource) => T;
};

export type ArmorExtrasInput = {
  armor: XmlValue | undefined;
  hitTester: XmlValue | undefined;
};

export type ArmorExtras = {
  spacedArmor?: string[];
  collision?: string;
};
