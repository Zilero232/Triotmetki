import { Button, buttonVariants } from '@/ui-kit';

import type { DownloadLinkProps } from './DownloadLink.types';

import { MOD_PAGE } from '../../../config';

export const DownloadLink = ({ isAvailable, href, fileName, icon: Icon, label, variant, hasShine = false }: DownloadLinkProps) =>
  isAvailable ? (
    <a className={buttonVariants({ variant, size: 'lg', shine: hasShine })} download={fileName} href={href} rel='noreferrer' target='_blank'>
      <Icon aria-hidden size={MOD_PAGE.iconSize} />
      {label}
    </a>
  ) : (
    <Button disabled size='lg' variant={variant}>
      <Icon aria-hidden size={MOD_PAGE.iconSize} />
      {label}
    </Button>
  );
