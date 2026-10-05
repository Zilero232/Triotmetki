import { ArrowRightLeft, Download, FolderSearch, PackagePlus } from 'lucide-react';

export const DOCK_ACTIONS = {
  chooseGame: { icon: FolderSearch, variant: 'secondary' },
  install: { icon: PackagePlus, variant: 'primary' },
  migrate: { icon: ArrowRightLeft, variant: 'primary' },
  update: { icon: Download, variant: 'premium' }
} as const;
