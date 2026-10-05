import type { Armor, ArmorGeometry, ArmorModules, ArmorPieceKind, Gun, Shot, VehicleSpec } from '@otmetki/gamedata';

import type { CollisionFile } from '../../parsers/collision/collision.types';

export type JoinArmorModelInput = {
  spec: VehicleSpec;
  collision: CollisionFile;
  shellNames?: ReadonlyMap<number, string>;
};

export type JoinedArmorModel = {
  geometry: ArmorGeometry;
  modules: ArmorModules;
  mismatches: string[];
};

export type PiecePlatesInput = {
  piece: string;
  kind: ArmorPieceKind;
  armor: Armor;
  spaced: readonly string[];
};

export type ResolvePieceInput = {
  declared: string | undefined;
  kind: ArmorPieceKind;
  index: number;
};

export type ShellOptionInput = {
  shot: Shot;
  shellNames: ReadonlyMap<number, string> | undefined;
};

export type GunModuleInput = {
  gun: Gun;
  index: number;
};

export type WeldInput = {
  positions: readonly number[];
  indices: readonly number[];
};

export type WeldedMesh = {
  positions: Float32Array;
  indices: Uint32Array;
};

export type IsOneOfInput = {
  values: readonly string[];
  value: string;
};
