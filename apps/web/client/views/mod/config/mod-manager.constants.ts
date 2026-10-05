import { Bug, CloudCog, Feather, FolderSync, Layers, SearchCheck, ShieldCheck, UserCog } from 'lucide-react';

export const MOD_MANAGER_FEATURES = [
  { id: 'sets', icon: Layers },
  { id: 'profiles', icon: UserCog },
  { id: 'sync', icon: CloudCog },
  { id: 'patches', icon: FolderSync },
  { id: 'safeInstall', icon: ShieldCheck },
  { id: 'conflicts', icon: SearchCheck },
  { id: 'perf', icon: Feather },
  { id: 'report', icon: Bug }
] as const;
