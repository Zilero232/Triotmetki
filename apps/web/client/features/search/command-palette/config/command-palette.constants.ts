import { target } from '@siberiacancode/reactuse';

export const COMMAND_PALETTE = {
  hotkeyTarget: target(() => window),
  skeletonWidths: [72, 54, 64],
  skeletonIcon: 32,
  metaSeparator: ' · '
} as const;
