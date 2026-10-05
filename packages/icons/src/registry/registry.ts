import type { VehicleType } from '@otmetki/schemas';

import type { NationIconComponent, TankClassIconComponent, TankClassKind } from '../icons';
import type { IconComponent } from '../lib';

import {
  ArmorIcon,
  AssaultSpgIcon,
  ChinaIcon,
  CrewCommanderIcon,
  CrewDriverIcon,
  CrewGunnerIcon,
  CrewLoaderIcon,
  CrewRadiomanIcon,
  CrosshairIcon,
  CzechIcon,
  EquipBondsIcon,
  EquipConsumableIcon,
  EquipDirectiveIcon,
  EquipExperimentalIcon,
  EquipStandardIcon,
  EquipTrophyIcon,
  FranceIcon,
  FrontlineIcon,
  GermanyIcon,
  GlobalMapIcon,
  HeavyTankIcon,
  HeavyTankSilhouetteIcon,
  IntUnionIcon,
  ItalyIcon,
  JapanIcon,
  LightTankIcon,
  LightTankSilhouetteIcon,
  Mark1Icon,
  Mark2Icon,
  Mark3Icon,
  MasteryFirstIcon,
  MasteryMasterIcon,
  MasterySecondIcon,
  MasteryThirdIcon,
  MediumTankIcon,
  MediumTankSilhouetteIcon,
  OnslaughtIcon,
  OtmetkiLogoIcon,
  PolandIcon,
  RadioIcon,
  RandomBattleIcon,
  RankedBattleIcon,
  ShellApcrIcon,
  ShellApIcon,
  ShellHeatIcon,
  ShellHeIcon,
  SpgIcon,
  SpgSilhouetteIcon,
  SpottingIcon,
  StrongholdIcon,
  SwedenIcon,
  TankDestroyerIcon,
  TankDestroyerSilhouetteIcon,
  TracerIcon,
  TrainingIcon,
  UkIcon,
  UsaIcon,
  UssrIcon
} from '../icons';

export const TANK_CLASSES = ['lightTank', 'mediumTank', 'heavyTank', 'AT-SPG', 'SPG'] as const satisfies readonly VehicleType[];

export type TankClass = VehicleType;

export const TANK_CLASS_KINDS = [...TANK_CLASSES, 'assaultSPG'] as const satisfies readonly TankClassKind[];

export const NATIONS = ['ussr', 'germany', 'usa', 'china', 'france', 'uk', 'japan', 'czech', 'sweden', 'poland', 'italy', 'intunion'] as const;

export type Nation = (typeof NATIONS)[number];

const KNOWN_NATIONS: readonly string[] = NATIONS;

export const isNation = (value: string): value is Nation => KNOWN_NATIONS.includes(value);

export const TANK_CLASS_ICONS = {
  lightTank: LightTankIcon,
  mediumTank: MediumTankIcon,
  heavyTank: HeavyTankIcon,
  'AT-SPG': TankDestroyerIcon,
  SPG: SpgIcon
} as const satisfies Record<VehicleType, TankClassIconComponent>;

export const TANK_CLASS_KIND_ICONS = {
  ...TANK_CLASS_ICONS,
  assaultSPG: AssaultSpgIcon
} as const satisfies Record<TankClassKind, TankClassIconComponent>;

export const TANK_CLASS_SILHOUETTES = {
  lightTank: LightTankSilhouetteIcon,
  mediumTank: MediumTankSilhouetteIcon,
  heavyTank: HeavyTankSilhouetteIcon,
  'AT-SPG': TankDestroyerSilhouetteIcon,
  SPG: SpgSilhouetteIcon
} as const satisfies Record<VehicleType, IconComponent>;

export const NATION_ICONS = {
  ussr: UssrIcon,
  germany: GermanyIcon,
  usa: UsaIcon,
  china: ChinaIcon,
  france: FranceIcon,
  uk: UkIcon,
  japan: JapanIcon,
  czech: CzechIcon,
  sweden: SwedenIcon,
  poland: PolandIcon,
  italy: ItalyIcon,
  intunion: IntUnionIcon
} as const satisfies Record<Nation, NationIconComponent>;

export const ICONS = {
  'otmetki-logo': OtmetkiLogoIcon,
  'class-light': LightTankIcon,
  'class-medium': MediumTankIcon,
  'class-heavy': HeavyTankIcon,
  'class-td': TankDestroyerIcon,
  'class-spg': SpgIcon,
  'class-spg-assault': AssaultSpgIcon,
  'silhouette-light': LightTankSilhouetteIcon,
  'silhouette-medium': MediumTankSilhouetteIcon,
  'silhouette-heavy': HeavyTankSilhouetteIcon,
  'silhouette-td': TankDestroyerSilhouetteIcon,
  'silhouette-spg': SpgSilhouetteIcon,
  'nation-ussr': UssrIcon,
  'nation-germany': GermanyIcon,
  'nation-usa': UsaIcon,
  'nation-china': ChinaIcon,
  'nation-france': FranceIcon,
  'nation-uk': UkIcon,
  'nation-japan': JapanIcon,
  'nation-czech': CzechIcon,
  'nation-sweden': SwedenIcon,
  'nation-poland': PolandIcon,
  'nation-italy': ItalyIcon,
  'nation-intunion': IntUnionIcon,
  'mark-1': Mark1Icon,
  'mark-2': Mark2Icon,
  'mark-3': Mark3Icon,
  'mastery-third': MasteryThirdIcon,
  'mastery-second': MasterySecondIcon,
  'mastery-first': MasteryFirstIcon,
  'mastery-master': MasteryMasterIcon,
  'mode-random': RandomBattleIcon,
  'mode-ranked': RankedBattleIcon,
  'mode-onslaught': OnslaughtIcon,
  'mode-frontline': FrontlineIcon,
  'mode-stronghold': StrongholdIcon,
  'mode-globalmap': GlobalMapIcon,
  'mode-training': TrainingIcon,
  tracer: TracerIcon,
  'shell-ap': ShellApIcon,
  'shell-he': ShellHeIcon,
  'shell-heat': ShellHeatIcon,
  'shell-apcr': ShellApcrIcon,
  armor: ArmorIcon,
  spotting: SpottingIcon,
  radio: RadioIcon,
  crosshair: CrosshairIcon,
  'crew-commander': CrewCommanderIcon,
  'crew-driver': CrewDriverIcon,
  'crew-gunner': CrewGunnerIcon,
  'crew-loader': CrewLoaderIcon,
  'crew-radioman': CrewRadiomanIcon,
  'equip-standard': EquipStandardIcon,
  'equip-trophy': EquipTrophyIcon,
  'equip-bonds': EquipBondsIcon,
  'equip-experimental': EquipExperimentalIcon,
  'equip-directive': EquipDirectiveIcon,
  'equip-consumable': EquipConsumableIcon
} as const satisfies Record<string, IconComponent>;

export type IconName = keyof typeof ICONS;

export const ICON_GROUPS = {
  brand: ['otmetki-logo'],
  classes: ['class-light', 'class-medium', 'class-heavy', 'class-td', 'class-spg', 'class-spg-assault'],
  silhouettes: ['silhouette-light', 'silhouette-medium', 'silhouette-heavy', 'silhouette-td', 'silhouette-spg'],
  nations: [
    'nation-ussr',
    'nation-germany',
    'nation-usa',
    'nation-china',
    'nation-france',
    'nation-uk',
    'nation-japan',
    'nation-czech',
    'nation-sweden',
    'nation-poland',
    'nation-italy',
    'nation-intunion'
  ],
  marks: ['mark-1', 'mark-2', 'mark-3'],
  mastery: ['mastery-third', 'mastery-second', 'mastery-first', 'mastery-master'],
  modes: ['mode-random', 'mode-ranked', 'mode-onslaught', 'mode-frontline', 'mode-stronghold', 'mode-globalmap', 'mode-training'],
  misc: ['tracer', 'shell-ap', 'shell-he', 'shell-heat', 'shell-apcr', 'armor', 'spotting', 'radio', 'crosshair'],
  crew: ['crew-commander', 'crew-driver', 'crew-gunner', 'crew-loader', 'crew-radioman'],
  equipment: ['equip-standard', 'equip-trophy', 'equip-bonds', 'equip-experimental', 'equip-directive', 'equip-consumable']
} as const satisfies Record<string, readonly IconName[]>;

export type IconGroup = keyof typeof ICON_GROUPS;

export const CREW_ROLE_ICONS = {
  commander: CrewCommanderIcon,
  driver: CrewDriverIcon,
  gunner: CrewGunnerIcon,
  loader: CrewLoaderIcon,
  radioman: CrewRadiomanIcon
} as const satisfies Record<string, IconComponent>;

export type CrewRole = keyof typeof CREW_ROLE_ICONS;

export const isCrewRole = (value: string): value is CrewRole => Object.hasOwn(CREW_ROLE_ICONS, value);

export const EQUIP_CATEGORY_ICONS = {
  standard: EquipStandardIcon,
  trophy: EquipTrophyIcon,
  deluxe: EquipBondsIcon,
  modernized: EquipExperimentalIcon,
  directive: EquipDirectiveIcon,
  consumable: EquipConsumableIcon
} as const satisfies Record<string, IconComponent>;
