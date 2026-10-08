import type { LucideIcon } from 'lucide-react';

import type { ButtonVariantProps } from '@/ui-kit';

export type DownloadLinkProps = {
  isAvailable: boolean;
  href: string;
  fileName: string;
  icon: LucideIcon;
  label: string;
  variant: NonNullable<ButtonVariantProps['variant']>;
  hasShine?: boolean;
};
