export { getArmorShowcase } from './api';
export { ARMOR_FACE_CLASSES, ARMOR_PALETTE } from './config';
export { ARMOR_SHADER, armorShaderValues } from './lib/armor-shader';
export type { ArmorShaderValues } from './lib/armor-shader';
export { buildPieceBuffers } from './lib/build-buffers';
export type { PieceBuffers } from './lib/build-buffers';
export { decodeArmorModel } from './lib/decode-model';
export type { ArmorModelData, ArmorShellState } from './model/armor-model.types';
export { useArmorGuns, useArmorModel } from './model/hooks';
