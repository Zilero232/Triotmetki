export { ARMOR_FLAGS, armorFlags, armorPieceKind, hasArmorFlag, listArmorGuns } from './armor-model';
export type {
  ArmorChassisModule,
  ArmorFlag,
  ArmorGeometry,
  ArmorGunModule,
  ArmorModules,
  ArmorPieceGeometry,
  ArmorPieceKind,
  ArmorPlate,
  ArmorShellOption,
  ArmorTurretModule,
  Vec3
} from './armor-model';
export { base64ToBytes, bytesToBase64, decodeArmorGeometry, encodeArmorGeometry } from './geometry';
export { ERF_APPROXIMATION, PENETRATION, penetrationAtDistance, SHELL_KINDS, SHELL_RULES, toShellKind, traceArmorRay } from './penetration';
export type { ArmorShell, ArmorTrace, ArmorTraceLayer, ArmorVerdict } from './penetration';
