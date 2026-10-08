import { Download, Gamepad2, ListChecks } from 'lucide-react';

export const MOD_INSTALL_STEPS = [
  { id: 'download', icon: Download },
  { id: 'pick', icon: ListChecks },
  { id: 'play', icon: Gamepad2 }
] as const;

export const MOD_INSTALL_PRESETS = ['recommended', 'minimal', 'streamer', 'all', 'custom'] as const;
