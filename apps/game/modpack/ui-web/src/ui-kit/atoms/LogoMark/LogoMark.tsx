import type { LogoMarkProps } from './LogoMark.types';

import { Icon } from '../Icon';

export const LogoMark = ({ size, className }: LogoMarkProps) => <Icon className={className} name='logo' size={size} tone='accent' />;
